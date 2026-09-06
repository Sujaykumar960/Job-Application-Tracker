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
