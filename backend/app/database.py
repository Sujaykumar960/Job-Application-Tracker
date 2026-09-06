import logging
import re
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, TEXT

from app.config import settings

logger = logging.getLogger("careerx.database")


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls) -> None:
        """Establish connection to MongoDB and verify ping."""
        safe_uri = re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", settings.MONGODB_URI)
        logger.info("Connecting to MongoDB at: %s", safe_uri)
        try:
            cls.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
            )
            cls.db = cls.client[settings.MONGODB_DB_NAME]
            # Verify connectivity
            await cls.client.admin.command("ping")
            logger.info("Connected to MongoDB database: %s", settings.MONGODB_DB_NAME)
            await cls.create_indexes()
        except Exception as e:
            logger.warning("Failed to connect to primary MongoDB (%s): %s", safe_uri, e)
            if "127.0.0.1:27017" not in settings.MONGODB_URI and "localhost:27017" not in settings.MONGODB_URI:
                try:
                    logger.info("Attempting fallback connection to local MongoDB at mongodb://127.0.0.1:27017...")
                    cls.client = AsyncIOMotorClient(
                        "mongodb://127.0.0.1:27017",
                        serverSelectionTimeoutMS=3000,
                    )
                    cls.db = cls.client[settings.MONGODB_DB_NAME]
                    await cls.client.admin.command("ping")
                    logger.info("Successfully connected to local MongoDB fallback database: %s", settings.MONGODB_DB_NAME)
                    await cls.create_indexes()
                    return
                except Exception as local_err:
                    logger.error("Local MongoDB fallback also failed: %s", local_err)
            raise e

    @classmethod
    async def disconnect(cls) -> None:
        """Close MongoDB connection."""
        if cls.client is not None:
            logger.info("Closing MongoDB client connection...")
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("MongoDB connection closed.")

    @classmethod
    async def create_indexes(cls) -> None:
        """Create essential MongoDB indexes across domain collections."""
        if cls.db is None:
            return

        try:
            # 1. Users Collection
            await cls.db.users.create_index([("email", ASCENDING)], unique=True)
            await cls.db.users.create_index([("createdAt", DESCENDING)])

            # 2. Profiles Collection
            await cls.db.profiles.create_index([("userId", ASCENDING)], unique=True)

            # 3. Applications Collection (userId, status, priority, company, dates)
            await cls.db.applications.create_index([("userId", ASCENDING)])
            await cls.db.applications.create_index([("status", ASCENDING)])
            await cls.db.applications.create_index([("priority", ASCENDING)])
            await cls.db.applications.create_index([("company", ASCENDING)])
            await cls.db.applications.create_index([("deadline", ASCENDING)])
            await cls.db.applications.create_index([("deadlineDate", ASCENDING)])
            await cls.db.applications.create_index([("interviewDate", ASCENDING)])
            await cls.db.applications.create_index([("userId", ASCENDING), ("status", ASCENDING)])
            await cls.db.applications.create_index([("userId", ASCENDING), ("appliedDate", DESCENDING)])
            await cls.db.applications.create_index([("userId", ASCENDING), ("deadlineDate", ASCENDING)])

            # 4. Jobs Collection (company, role/title, location, filters, active, postedDate)
            await cls.db.jobs.create_index([("company", ASCENDING)])
            await cls.db.jobs.create_index([("companyName", ASCENDING)])
            await cls.db.jobs.create_index([("title", ASCENDING)])
            await cls.db.jobs.create_index([("location", ASCENDING)])
            await cls.db.jobs.create_index([("experienceLevel", ASCENDING)])
            await cls.db.jobs.create_index([("roleCategory", ASCENDING)])
            await cls.db.jobs.create_index([("workType", ASCENDING)])
            await cls.db.jobs.create_index([("jobType", ASCENDING)])
            await cls.db.jobs.create_index([("salaryMin", ASCENDING)])
            await cls.db.jobs.create_index([("salaryMax", ASCENDING)])
            await cls.db.jobs.create_index([("skills.name", ASCENDING)])
            await cls.db.jobs.create_index([("requiredSkills", ASCENDING)])
            await cls.db.jobs.create_index([("isActive", ASCENDING)])
            await cls.db.jobs.create_index([("postedDate", DESCENDING)])
            await cls.db.jobs.create_index(
                [("title", TEXT), ("company", TEXT), ("description", TEXT)],
                name="job_search_text_index",
            )

            # 5. Technical Social Network (Posts & Comments) - feed createdAt
            await cls.db.posts.create_index([("createdAt", DESCENDING)])
            await cls.db.posts.create_index([("authorId", ASCENDING)])
            await cls.db.posts.create_index([("type", ASCENDING)])
            await cls.db.posts.create_index([("tags", ASCENDING)])
            await cls.db.comments.create_index([("postId", ASCENDING), ("createdAt", ASCENDING)])

            # 6. Notifications Collection (userId + createdAt, isRead, dedupKey)
            await cls.db.notifications.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
            await cls.db.notifications.create_index([("userId", ASCENDING), ("isRead", ASCENDING)])
            await cls.db.notifications.create_index([("userId", ASCENDING), ("dedupKey", ASCENDING)])

            # 7. Conversations & Messages (participants, conversationId + timestamp)
            await cls.db.conversations.create_index([("participants", ASCENDING)])
            await cls.db.conversations.create_index([("updatedAt", DESCENDING)])
            await cls.db.messages.create_index([("conversationId", ASCENDING), ("createdAt", ASCENDING)])
            await cls.db.messages.create_index([("conversationId", ASCENDING), ("timestamp", ASCENDING)])
            await cls.db.messages.create_index([("senderId", ASCENDING)])

            # 8. Connections & Invitations (requester/recipient)
            await cls.db.connections.create_index(
                [("requesterId", ASCENDING), ("receiverId", ASCENDING)],
                unique=True,
            )
            await cls.db.connections.create_index([("status", ASCENDING)])
            await cls.db.connections.create_index([("requesterId", ASCENDING)])
            await cls.db.connections.create_index([("receiverId", ASCENDING)])
            await cls.db.follows.create_index(
                [("followerId", ASCENDING), ("targetUserId", ASCENDING)],
                unique=True,
            )

            # 9. Recruiter Candidates (skills, role, location, experience, assessmentScore, jobMatch)
            await cls.db.candidates.create_index([("skills", ASCENDING)])
            await cls.db.candidates.create_index([("role", ASCENDING)])
            await cls.db.candidates.create_index([("location", ASCENDING)])
            await cls.db.candidates.create_index([("experienceLevel", ASCENDING)])
            await cls.db.candidates.create_index([("assessmentScore", DESCENDING)])
            await cls.db.candidates.create_index([("jobMatch", DESCENDING)])
            await cls.db.candidates.create_index([("privacy.searchStatus", ASCENDING)])

            # 10. Recruiter Interactions (Shortlists & Interview Stages)
            await cls.db.recruiter_interactions.create_index(
                [("recruiterId", ASCENDING), ("candidateId", ASCENDING)],
                unique=True,
            )
            await cls.db.recruiter_interactions.create_index(
                [("recruiterId", ASCENDING), ("isShortlisted", ASCENDING)]
            )
            await cls.db.recruiter_interactions.create_index(
                [("recruiterId", ASCENDING), ("interviewStage", ASCENDING)]
            )

            # 11. Resumes & Resume Analyses Collections (Strict User Ownership)
            await cls.db.resumes.create_index([("id", ASCENDING)], unique=True)
            await cls.db.resumes.create_index([("id", ASCENDING), ("userId", ASCENDING)])
            await cls.db.resumes.create_index([("userId", ASCENDING), ("uploadedAt", DESCENDING)])
            await cls.db.resumes.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
            await cls.db.resumes.create_index([("userId", ASCENDING), ("isActive", ASCENDING)])
            await cls.db.resumes.create_index([("userId", ASCENDING), ("isPrimary", ASCENDING)])

            await cls.db.resume_analyses.create_index([("id", ASCENDING)], unique=True)
            await cls.db.resume_analyses.create_index([("resumeId", ASCENDING), ("userId", ASCENDING)])
            await cls.db.resume_analyses.create_index([("userId", ASCENDING), ("resumeId", ASCENDING)])
            await cls.db.resume_analyses.create_index([("userId", ASCENDING), ("analyzedAt", DESCENDING)])
            await cls.db.resume_analyses.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])

            # 12. Coding Questions & Practice
            await cls.db.questions.create_index([("slug", ASCENDING)], unique=True)
            await cls.db.questions.create_index([("difficulty", ASCENDING)])
            await cls.db.questions.create_index([("category", ASCENDING)])

            # 13. Companies
            await cls.db.companies.create_index([("slug", ASCENDING)], unique=True)
            await cls.db.companies.create_index([("name", ASCENDING)])

            logger.info("All domain MongoDB indexes verified / created successfully.")
        except Exception as e:
            logger.warning("Error creating MongoDB indexes (non-fatal): %s", e)


def get_database() -> AsyncIOMotorDatabase:
    """Dependency / accessor to get database instance."""
    import asyncio
    if DatabaseManager.db is None:
        raise RuntimeError("Database is not initialized. Application lifespan not started.")
    try:
        current_loop = asyncio.get_running_loop()
        client_loop = getattr(DatabaseManager.client, "io_loop", None)
        if client_loop and (client_loop.is_closed() or client_loop != current_loop):
            DatabaseManager.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
            )
            DatabaseManager.db = DatabaseManager.client[settings.MONGODB_DB_NAME]
    except RuntimeError:
        pass
    return DatabaseManager.db
