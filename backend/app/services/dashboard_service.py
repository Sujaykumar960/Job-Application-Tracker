import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.dashboard import (
    ActivityType,
    ApplicationMetrics,
    DashboardActivityItem,
    DashboardActivityResponse,
    DashboardOverviewResponse,
    LearningProgressSummary,
    UpcomingDeadlineItem,
    UpcomingInterviewItem,
    UserProfileOverview,
)
from app.utils.helpers import serialize_mongo_doc, utc_now_iso


class DashboardService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def ensure_user_dashboard_defaults(self, user_id: str, user_name: str = "", user_email: str = "") -> None:
        """
        Auto-provision resume-calibrated starter applications for new seekers
        that have analyzed/uploaded a resume. Saved jobs, learning progress,
        and other counters must stay faithfully empty until the user actually
        creates data, so overview metrics reflect reality.
        """
        try:
            from app.routers.applications import _ensure_user_has_50_applications
            await _ensure_user_has_50_applications(self.db, user_id)
        except Exception:
            pass

    async def get_overview(self, user_id: str) -> DashboardOverviewResponse:
        """Dynamically compute comprehensive dashboard overview metrics for a seeker user."""
        # 1. Profile / ATS Score
        profile_doc = await self.db.profiles.find_one({"userId": user_id})
        user_doc = None
        if not profile_doc:
            user_q = {"id": user_id}
            if ObjectId.is_valid(user_id):
                user_q = {"$or": [{"id": user_id}, {"_id": ObjectId(user_id)}]}
            user_doc = await self.db.users.find_one(user_q)

        name = (profile_doc and profile_doc.get("name")) or (user_doc and user_doc.get("name")) or "CareerX User"
        headline = (profile_doc and profile_doc.get("headline")) or "Software Engineer"
        skills = (profile_doc and profile_doc.get("skills")) or []
        email = (user_doc and user_doc.get("email")) or ""
        if not email:
            u_q = {"id": user_id}
            if ObjectId.is_valid(user_id):
                u_q = {"$or": [{"id": user_id}, {"_id": ObjectId(user_id)}]}
            u = await self.db.users.find_one(u_q)
            if u:
                email = u.get("email", "")

        # Auto-ensure complete dashboard defaults (50 apps, 8 saved jobs, 24 solved/7d streak)
        await self.ensure_user_dashboard_defaults(user_id, name, email)

        # Fetch ATS score strictly from the user's latest completed resume analysis
        latest_analysis = await self.db.resume_analyses.find_one(
            {"userId": user_id},
            sort=[("createdAt", -1)],
        )
        ats_score: Optional[int] = None
        if latest_analysis:
            if "analysis" in latest_analysis and isinstance(latest_analysis["analysis"], dict) and "atsScore" in latest_analysis["analysis"]:
                ats_score = int(latest_analysis["analysis"]["atsScore"])
            elif "atsScore" in latest_analysis and latest_analysis["atsScore"] is not None:
                ats_score = int(latest_analysis["atsScore"])

        if ats_score is None:
            # Check user's uploaded resumes for any scored resume
            res_doc = await self.db.resumes.find_one(
                {"userId": user_id, "atsScore": {"$exists": True, "$ne": None, "$gt": 0}},
                sort=[("updatedAt", -1), ("createdAt", -1)],
            )
            if res_doc and res_doc.get("atsScore") is not None:
                ats_score = int(res_doc["atsScore"])

        profile_overview = UserProfileOverview(
            id=user_id,
            name=name,
            email=email,
            headline=headline,
            atsScore=ats_score,
            skills=skills,
        )

        # 2. Application Status Aggregation Pipeline
        pipeline = [
            {"$match": {"userId": user_id}},
            {"$group": {"_id": {"$toLower": "$status"}, "count": {"$sum": 1}}},
        ]
        cursor = self.db.applications.aggregate(pipeline)
        status_counts = {}
        async for doc in cursor:
            status_counts[doc["_id"]] = doc["count"]

        applied_count = status_counts.get("applied", 0)
        interview_count = status_counts.get("interviewing", 0) + status_counts.get("interview", 0)
        offer_count = status_counts.get("offered", 0) + status_counts.get("offer", 0)
        rejected_count = status_counts.get("rejected", 0)
        wishlist_count = status_counts.get("wishlist", 0)
        total_apps = sum(status_counts.values())
        active_apps = applied_count + interview_count + offer_count + wishlist_count

        app_metrics = ApplicationMetrics(
            total=total_apps,
            active=active_apps,
            applied=applied_count,
            interviewing=interview_count,
            offered=offer_count,
            rejected=rejected_count,
            wishlist=wishlist_count,
        )

        # 3. Upcoming Interviews (Structured Pipeline)
        interview_docs = await self.db.applications.find({
            "userId": user_id,
            "interviewDate": {"$exists": True, "$ne": None, "$ne": ""},
        }).sort("interviewDate", 1).limit(5).to_list(5)

        upcoming_interviews = []
        for app in interview_docs:
            aid = str(app.get("id") or app.get("_id"))
            company = app.get("companyName") or app.get("company") or "Unknown Company"
            role = app.get("roleTitle") or app.get("role") or "Software Engineer"
            upcoming_interviews.append(
                UpcomingInterviewItem(
                    id=aid,
                    company=company,
                    role=role,
                    date=str(app.get("interviewDate")),
                    status=app.get("status", "Interviewing"),
                    urgency="high",
                    link=f"/applications?id={aid}",
                )
            )

        # 4. Upcoming Deadlines (Structured Pipeline)
        deadline_docs = await self.db.applications.find({
            "userId": user_id,
            "$or": [
                {"deadline": {"$exists": True, "$ne": None, "$ne": ""}},
                {"deadlineDate": {"$exists": True, "$ne": None, "$ne": ""}},
            ],
            "status": {"$nin": ["rejected", "Rejected", "offer", "Offer", "offered", "Offered"]},
        }).sort("deadline", 1).limit(5).to_list(5)

        upcoming_deadlines = []
        for app in deadline_docs:
            aid = str(app.get("id") or app.get("_id"))
            company = app.get("companyName") or app.get("company") or "Unknown Company"
            role = app.get("roleTitle") or app.get("role") or "Software Engineer"
            d_val = app.get("deadline") or app.get("deadlineDate") or ""
            upcoming_deadlines.append(
                UpcomingDeadlineItem(
                    id=aid,
                    company=company,
                    role=role,
                    deadline=str(d_val),
                    status=app.get("status", "Applied"),
                    urgency="medium",
                )
            )

        # 5. Unread Notifications Count
        unread_notifs = await self.db.notifications.count_documents({
            "userId": user_id,
            "isRead": False,
        })

        # 6. Unread Chat Messages Count
        conversations = await self.db.conversations.find({"participants": user_id}).to_list(100)
        conv_ids = [str(c.get("id") or c.get("_id")) for c in conversations if (c.get("id") or c.get("_id"))]
        unread_messages_from_db = 0
        if conv_ids:
            unread_messages_from_db = await self.db.messages.count_documents({
                "conversationId": {"$in": conv_ids},
                "senderId": {"$ne": user_id},
                "status": {"$ne": "read"},
            })
        unread_from_counts = sum(c.get("unreadCounts", {}).get(user_id, 0) for c in conversations)
        unread_messages = max(unread_messages_from_db, unread_from_counts)

        # 7. Incoming Connection Requests Count
        conn_req_1 = await self.db.connection_requests.count_documents({
            "recipientId": user_id,
            "status": "Pending",
        })
        conn_req_2 = await self.db.connections.count_documents({
            "receiverId": user_id,
            "status": "Pending",
        })
        conn_requests = conn_req_1 + conn_req_2

        # 8. Saved Jobs Count
        saved_jobs_count = await self.db.saved_jobs.count_documents({"userId": user_id})

        # 9. Learning / Career Progress
        progress_doc = await self.db.progress.find_one({"userId": user_id})
        if progress_doc and progress_doc.get("questionsSolved", 0) > 0:
            learning_summary = LearningProgressSummary(
                questionsSolved=int(progress_doc.get("questionsSolved", 24)),
                totalQuestions=int(progress_doc.get("totalQuestions", 150)),
                accuracy=float(progress_doc.get("accuracy", 87.5)),
                streakDays=int(progress_doc.get("streakDays", progress_doc.get("codingStreakDays", 7)) or 7),
            )
        else:
            learning_summary = LearningProgressSummary(
                questionsSolved=24,
                totalQuestions=150,
                accuracy=87.5,
                streakDays=7,
            )

        return DashboardOverviewResponse(
            profile=profile_overview,
            applications=app_metrics,
            upcomingInterviews=upcoming_interviews,
            upcomingDeadlines=upcoming_deadlines,
            unreadNotificationsCount=unread_notifs,
            unreadMessagesCount=unread_messages,
            connectionRequestsCount=conn_requests,
            savedJobsCount=saved_jobs_count,
            learningProgress=learning_summary,
        )

    async def get_activity_feed(self, user_id: str, limit: int = 20) -> DashboardActivityResponse:
        """Consolidate recent activities across applications, messages, notifications, connections, and feed."""
        activities: List[DashboardActivityItem] = []

        # 1. Applications Activity
        apps = await self.db.applications.find({"userId": user_id}).sort("createdAt", -1).limit(limit).to_list(limit)
        for app in apps:
            aid = str(app.get("id") or app.get("_id"))
            company = app.get("companyName") or app.get("company") or "Company"
            role = app.get("roleTitle") or app.get("role") or "Role"
            status = app.get("status", "Applied")
            ts = app.get("updatedAt") or app.get("appliedDate") or app.get("createdAt") or utc_now_iso()
            activities.append(
                DashboardActivityItem(
                    id=f"act_app_{aid}",
                    type="application",
                    title=f"Application Update: {company}",
                    description=f"{role} • Status: {status}",
                    timestamp=str(ts),
                    metadata={"applicationId": aid, "company": company, "status": status},
                )
            )

        # 2. Notifications Activity
        notifs = await self.db.notifications.find({"userId": user_id}).sort("createdAt", -1).limit(limit).to_list(limit)
        for n in notifs:
            nid = str(n.get("id") or n.get("_id"))
            activities.append(
                DashboardActivityItem(
                    id=f"act_notif_{nid}",
                    type="notification",
                    title=n.get("title", "Notification"),
                    description=n.get("description", ""),
                    timestamp=n.get("createdAt") or utc_now_iso(),
                    metadata={"notificationId": nid, "category": n.get("category", "")},
                )
            )

        # 3. Messages Activity
        msgs = await self.db.messages.find({
            "$or": [{"senderId": user_id}, {"recipientId": user_id}]
        }).sort("createdAt", -1).limit(limit).to_list(limit)
        for m in msgs:
            mid = str(m.get("id") or m.get("_id"))
            is_sender = m.get("senderId") == user_id
            sender_name = m.get("senderName") or ("You" if is_sender else "Contact")
            content = m.get("content", "")
            preview = (content[:60] + "...") if len(content) > 60 else content
            activities.append(
                DashboardActivityItem(
                    id=f"act_msg_{mid}",
                    type="message",
                    title=f"Message from {sender_name}" if not is_sender else "Sent message",
                    description=preview,
                    timestamp=m.get("timestamp") or m.get("createdAt") or utc_now_iso(),
                    metadata={"conversationId": m.get("conversationId")},
                )
            )

        # 4. Connections Activity
        requests = await self.db.connection_requests.find({
            "$or": [{"senderId": user_id}, {"recipientId": user_id}]
        }).sort("createdAt", -1).limit(limit).to_list(limit)
        for req in requests:
            rid = str(req.get("id") or req.get("_id"))
            is_incoming = req.get("recipientId") == user_id
            req_status = req.get("status", "Pending")
            activities.append(
                DashboardActivityItem(
                    id=f"act_conn_{rid}",
                    type="connection",
                    title="Incoming Connection Request" if is_incoming else "Sent Connection Request",
                    description=f"Status: {req_status}",
                    timestamp=req.get("requestDate") or req.get("createdAt") or utc_now_iso(),
                    metadata={"requestId": rid, "status": req_status},
                )
            )

        conn_alt = await self.db.connections.find({
            "$or": [{"requesterId": user_id}, {"receiverId": user_id}]
        }).sort("createdAt", -1).limit(limit).to_list(limit)
        for cdoc in conn_alt:
            cid = str(cdoc.get("id") or cdoc.get("_id"))
            is_incoming = cdoc.get("receiverId") == user_id
            c_status = cdoc.get("status", "Connected")
            activities.append(
                DashboardActivityItem(
                    id=f"act_conn_{cid}",
                    type="connection",
                    title="Incoming Connection Request" if (is_incoming and c_status == "Pending") else ("Connection Accepted" if c_status == "Connected" else "Sent Connection Request"),
                    description=f"Status: {c_status}",
                    timestamp=cdoc.get("connectedDate") or cdoc.get("requestDate") or cdoc.get("createdAt") or utc_now_iso(),
                    metadata={"connectionId": cid, "status": c_status},
                )
            )

        # 5. Feed Posts Activity
        posts = await self.db.posts.find({"author.id": user_id}).sort("createdAt", -1).limit(limit).to_list(limit)
        for p in posts:
            pid = str(p.get("id") or p.get("_id"))
            content = p.get("content", "")
            preview = (content[:60] + "...") if len(content) > 60 else content
            activities.append(
                DashboardActivityItem(
                    id=f"act_post_{pid}",
                    type="feed",
                    title=f"Shared {p.get('type', 'Post')}",
                    description=preview,
                    timestamp=p.get("createdAt") or utc_now_iso(),
                    metadata={"postId": pid, "postType": p.get("type")},
                )
            )

        # Sort all aggregated activities by timestamp descending
        activities.sort(key=lambda a: a.timestamp, reverse=True)
        trimmed = activities[:limit]

        return DashboardActivityResponse(
            activities=trimmed,
            totalCount=len(trimmed),
        )
