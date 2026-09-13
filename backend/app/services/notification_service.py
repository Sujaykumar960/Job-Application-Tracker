from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.notification_repository import NotificationRepository
from app.utils.helpers import utc_now_iso


class NotificationService:
    @staticmethod
    async def notify_new_message(
        db: AsyncIOMotorDatabase,
        recipient_id: str,
        sender_name: str,
        message_preview: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        """Generate a message notification from an incoming chat message."""
        repo = NotificationRepository(db)
        dedup_key = f"msg:{message_id}"
        doc = {
            "userId": recipient_id,
            "category": "message",
            "title": f"New Message from {sender_name}",
            "description": f"“{message_preview[:120]}”",
            "priority": "normal",
            "actionLabel": f"Reply to {sender_name}",
            "actionUrl": "/messages",
            "actionPayload": {"conversationId": conversation_id, "messageId": message_id},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_connection_request(
        db: AsyncIOMotorDatabase,
        recipient_id: str,
        requester_name: str,
        requester_company: Optional[str],
        note: Optional[str],
        request_id: str,
    ) -> Dict[str, Any]:
        """Generate a connection_request notification from an incoming invitation."""
        repo = NotificationRepository(db)
        dedup_key = f"conn_req:{request_id}"
        company_info = f" ({requester_company})" if requester_company else ""
        desc = (
            f"{requester_name}{company_info} sent you a connection request: “{note[:100]}”"
            if note
            else f"{requester_name}{company_info} sent you a connection invitation."
        )
        doc = {
            "userId": recipient_id,
            "category": "connection_request",
            "title": f"Connection Request: {requester_name}",
            "description": desc,
            "priority": "normal",
            "company": requester_company,
            "actionLabel": "Review Request",
            "actionUrl": "/network",
            "actionPayload": {"requestId": request_id},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_application_deadline(
        db: AsyncIOMotorDatabase,
        user_id: str,
        company: str,
        role_title: str,
        deadline_date: str,
        application_id: str,
    ) -> Dict[str, Any]:
        """Generate an application_deadline notification for approaching cutoff."""
        repo = NotificationRepository(db)
        dedup_key = f"deadline:{application_id}:{deadline_date}"
        doc = {
            "userId": user_id,
            "category": "application_deadline",
            "title": f"Deadline Alert: {company} - {role_title}",
            "description": f"Applications for {role_title} at {company} close on {deadline_date}. Submit your application materials soon.",
            "priority": "urgent",
            "company": company,
            "actionLabel": "View Application",
            "actionUrl": f"/applications",
            "actionPayload": {"applicationId": application_id, "deadlineDate": deadline_date},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_upcoming_interview(
        db: AsyncIOMotorDatabase,
        user_id: str,
        company: str,
        interview_round: str,
        interview_date: str,
        application_id: str,
    ) -> Dict[str, Any]:
        """Generate an interview_reminder notification for upcoming technical rounds."""
        repo = NotificationRepository(db)
        dedup_key = f"interview:{application_id}:{interview_date}"
        doc = {
            "userId": user_id,
            "category": "interview_reminder",
            "title": f"Upcoming {company} Interview: {interview_round}",
            "description": f"Your technical interview ({interview_round}) with {company} is scheduled for {interview_date}.",
            "priority": "urgent",
            "company": company,
            "actionLabel": "Review Details",
            "actionUrl": "/applications",
            "actionPayload": {"applicationId": application_id, "interviewDate": interview_date},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_job_recommendation(
        db: AsyncIOMotorDatabase,
        user_id: str,
        job_id: str,
        company: str,
        title: str,
        match_score: int,
    ) -> Dict[str, Any]:
        """Generate a job_recommendation notification for high-match roles."""
        repo = NotificationRepository(db)
        dedup_key = f"job_rec:{user_id}:{job_id}"
        doc = {
            "userId": user_id,
            "category": "job_recommendation",
            "title": f"High Match Job: {title} at {company}",
            "description": f"A new position matching your profile ({match_score}% compatibility) was posted by {company}.",
            "priority": "normal",
            "company": company,
            "actionLabel": "View Job",
            "actionUrl": f"/jobs",
            "actionPayload": {"jobId": job_id, "matchScore": match_score},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_connection_accepted(
        db: AsyncIOMotorDatabase,
        recipient_id: str,
        peer_name: str,
        peer_company: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a connection_accepted notification when an invitation is accepted."""
        repo = NotificationRepository(db)
        dedup_key = f"conn_acc:{recipient_id}:{peer_name}"
        company_info = f" ({peer_company})" if peer_company else ""
        doc = {
            "userId": recipient_id,
            "category": "connection_accepted",
            "title": f"Connection Accepted: {peer_name}",
            "description": f"{peer_name}{company_info} accepted your connection request. You are now 1st-degree connections.",
            "priority": "normal",
            "company": peer_company,
            "actionLabel": "View Profile",
            "actionUrl": "/network",
            "actionPayload": {"peerName": peer_name, "requestId": request_id},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_post_liked(
        db: AsyncIOMotorDatabase,
        author_id: str,
        liker_name: str,
        post_id: str,
        post_snippet: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate a post_like notification when another engineer likes a post."""
        repo = NotificationRepository(db)
        dedup_key = f"like:{post_id}:{liker_name}"
        preview = f" “{post_snippet[:60]}...”" if post_snippet else ""
        doc = {
            "userId": author_id,
            "category": "post_like",
            "title": f"{liker_name} liked your post",
            "description": f"{liker_name} reacted to your post{preview}",
            "priority": "normal",
            "actionLabel": "View Post",
            "actionUrl": "/feed",
            "actionPayload": {"postId": post_id},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_post_commented(
        db: AsyncIOMotorDatabase,
        author_id: str,
        commenter_name: str,
        post_id: str,
        comment_text: str,
        comment_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate a post_comment notification when another engineer comments on a post."""
        repo = NotificationRepository(db)
        dedup_key = f"comment:{comment_id or post_id}:{commenter_name}"
        preview = f"“{comment_text[:80]}”" if comment_text else ""
        doc = {
            "userId": author_id,
            "category": "post_comment",
            "title": f"{commenter_name} commented on your post",
            "description": f"{commenter_name} wrote: {preview}",
            "priority": "normal",
            "actionLabel": "View Comment",
            "actionUrl": "/feed",
            "actionPayload": {"postId": post_id, "commentId": comment_id},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

    @staticmethod
    async def notify_calendar_event(
        db: AsyncIOMotorDatabase,
        user_id: str,
        title: str,
        date: str,
        time: str,
        event_id: str,
        company: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate a calendar_event notification when an event is scheduled."""
        repo = NotificationRepository(db)
        dedup_key = f"cal_evt:{event_id}:{date}"
        company_info = f" ({company})" if company else ""
        doc = {
            "userId": user_id,
            "category": "calendar_event",
            "title": f"Calendar Event: {title}",
            "description": f"{title}{company_info} scheduled for {date} at {time}.",
            "priority": "normal",
            "company": company,
            "actionLabel": "View Calendar",
            "actionUrl": "/calendar",
            "actionPayload": {"eventId": event_id, "date": date},
        }
        return await repo.create_deduped_notification(doc, dedup_key=dedup_key)

