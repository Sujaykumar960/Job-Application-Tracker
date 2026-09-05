from app.schemas.application import ApplicationCreate, ApplicationFilterQuery, ApplicationResponse, ApplicationUpdate
from app.schemas.chat import ChatAttachment, ChatConversation, ChatMessage, ConversationCreate, MessageFilterQuery
from app.schemas.connection import ConnectionCreate, ConnectionFilterQuery, ConnectionResponse, NetworkUser
from app.schemas.job import JobCreate, JobFilterQuery, JobResponse, JobUpdate
from app.schemas.notification import CareerNotification, NotificationCreate, NotificationFilterQuery, NotificationUpdate
from app.schemas.post import CommentCreate, FeedPost, PostCreate, PostFilterQuery, PostUpdate
from app.schemas.recruiter import CandidateCreate, CandidateFilterQuery, CandidateUpdate, RecruiterCandidate, RecruiterMetrics
from app.schemas.user import ProfilePrivacySettings, UserProfileCreate, UserProfileResponse, UserProfileUpdate


def test_user_profile_schemas():
    create_data = UserProfileCreate(
        name="Alex Rivera",
        email="alex@careerx.io",
        role="seeker",
        headline="Distributed Systems Engineer",
        skills=["Go", "PostgreSQL"],
    )
    assert create_data.name == "Alex Rivera"

    update_data = UserProfileUpdate(headline="Staff Engineer")
    assert update_data.headline == "Staff Engineer"

    resp = UserProfileResponse(
        id="usr_123",
        name="Alex Rivera",
        email="alex@careerx.io",
        role="seeker",
        headline="Staff Engineer",
        skills=["Go", "PostgreSQL"],
        privacy=ProfilePrivacySettings(),
    )
    assert resp.id == "usr_123"
    assert resp.privacy.contactVisibility == "all_recruiters"


def test_application_schemas():
    create_data = ApplicationCreate(
        company="Stripe",
        role="Backend Infrastructure Engineer",
        companyName="Stripe",
        roleTitle="Backend Infrastructure Engineer",
        location="San Francisco, CA",
        appliedDate="2026-09-01",
        deadline="2026-09-15",
        status="Interview",
        priority="High",
        salaryRange="$180k - $220k",
        matchScore=94,
        tags=["Go", "Kafka"],
    )
    assert create_data.company == "Stripe"

    resp = ApplicationResponse(
        id="app_123",
        **create_data.model_dump(),
    )
    assert resp.id == "app_123"
    assert resp.matchScore == 94

    query = ApplicationFilterQuery(status="Interview", priority="High")
    assert query.status == "Interview"


def test_job_schemas():
    create_data = JobCreate(
        title="Staff SRE",
        company="Datadog",
        location="New York, NY",
        salaryRange="$190k - $230k",
        workType="Hybrid",
        jobType="Full-time",
        experienceLevel="Senior",
        roleCategory="SRE",
        description="Lead platform reliability...",
    )
    assert create_data.title == "Staff SRE"

    resp = JobResponse(
        id="job_456",
        postedDate="2026-09-01",
        postedAgo="2d ago",
        matchScore=92,
        **create_data.model_dump(),
    )
    assert resp.id == "job_456"
    assert resp.postedAgo == "2d ago"

    query = JobFilterQuery(search="Datadog", sortBy="salary")
    assert query.sortBy == "salary"


def test_post_and_comment_schemas():
    post_create = PostCreate(
        content="Sliding window logs with Redis Lua...",
        type="Technical Discussion",
        tags=["Redis", "DistributedSystems"],
        codeSnippet="redis.call('ZADD', key, now, now)",
    )
    assert post_create.codeSnippet is not None

    post_resp = FeedPost(
        id="post_789",
        author={"name": "Alex", "headline": "Dev", "avatarInitials": "AR", "isVerified": True},
        type=post_create.type,
        createdAt="2h ago",
        content=post_create.content,
        tags=post_create.tags,
        codeSnippet=post_create.codeSnippet,
        likesCount=42,
        isLiked=True,
        commentsCount=3,
        isSaved=False,
        sharesCount=5,
        comments=[],
    )
    assert post_resp.likesCount == 42
    assert post_resp.isLiked is True


def test_connection_schemas():
    user = NetworkUser(
        id="usr_conn_1",
        name="Elena Rostova",
        headline="Staff Infrastructure Engineer",
        avatarInitials="ER",
        avatarGradient="from-purple-500 to-indigo-600",
        company="CloudScale",
        location="Seattle, WA",
        skills=["Go", "Kubernetes"],
        mutualCount=14,
        mutualNames=["Sarah Lin"],
        connectionState="Connected",
        isFollowing=True,
    )
    assert user.connectionState == "Connected"
    assert user.isFollowing is True

    create = ConnectionCreate(receiverId="usr_target", note="Hello!")
    assert create.note == "Hello!"


def test_notification_schemas():
    notif = CareerNotification(
        id="notif_1",
        category="interview_reminder",
        title="Upcoming Onsite",
        description="Interview at 10:00 AM",
        createdAt="2026-09-03T10:00:00Z",
        isRead=False,
        priority="urgent",
        company="Stripe",
        actionLabel="Open Briefing",
        actionUrl="/messages",
    )
    assert notif.priority == "urgent"
    assert notif.isRead is False


def test_chat_and_attachment_schemas():
    att = ChatAttachment(
        id="att_1",
        name="Resume.pdf",
        size="2.4 MB",
        type="pdf",
        url="https://careerx.io/resumes/res.pdf",
    )
    msg = ChatMessage(
        id="msg_1",
        conversationId="conv_1",
        senderId="usr_alex",
        senderName="Alex Rivera",
        content="Attached my resume",
        timestamp="10:30 AM",
        isOutgoing=True,
        status="sent",
        attachment=att,
    )
    assert msg.attachment.name == "Resume.pdf"
    assert msg.isOutgoing is True


def test_recruiter_candidate_schemas():
    cand = RecruiterCandidate(
        id="cand_1",
        name="Alex Rivera",
        role="Distributed Systems Engineer",
        location="Seattle, WA",
        experienceLevel="Mid Level",
        yearsExperience="2.5 yrs",
        skills=["Go", "Kafka", "PostgreSQL"],
        questionsSolved=142,
        totalQuestions=150,
        accuracy=93.4,
        streak=14,
        projectsCount=4,
        featuredProjects=["Sliding Window Rate Limiter"],
        assessmentName="Backend Systems Exam",
        assessmentScore=94,
        assessmentPercentile="Top 6%",
        jobMatch=94,
        targetRole="Core Payments Engineer",
        careerGrowthMetric="+42% growth",
        atsScore=88,
        avatarInitials="AR",
        avatarGradient="from-brand-600 to-indigo-800",
        isShortlisted=True,
        interviewStage="Technical Onsite",
        privacy={
            "searchStatus": "actively_looking",
            "showSalary": True,
            "salaryExpectation": "$175,000 - $205,000",
            "contactVisibility": "all_recruiters",
            "email": "alex@devmail.io",
            "phone": "+1 555-0199",
            "cloakedFromCurrentEmployer": True,
            "currentEmployer": "CloudScale",
        },
    )
    assert cand.isShortlisted is True
    assert cand.privacy.salaryExpectation == "$175,000 - $205,000"
