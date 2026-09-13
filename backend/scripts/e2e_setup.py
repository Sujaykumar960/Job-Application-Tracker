import os
import sys
from pathlib import Path
from datetime import datetime, timezone
import bcrypt
from pymongo import MongoClient

# Strict Safety Check: MUST be running against careerx_e2e_db
E2E_DB_NAME = "careerx_e2e_db"

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def main():
    print("==================================================")
    print("  CAREERX E2E TEST DATABASE SEED & ISOLATION CHECK")
    print("==================================================")

    # 1. Verification of environment variables
    env_db = os.environ.get("MONGODB_DB_NAME", E2E_DB_NAME)
    if env_db != E2E_DB_NAME:
        print(f"[FATAL] SAFETY CHECK FAILED! Target database is '{env_db}', but MUST be '{E2E_DB_NAME}'!")
        sys.exit(1)

    print(f"[*] Verified safe target database: {env_db}")

    mongo_uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    
    # Test ping
    try:
        client.admin.command("ping")
        print(f"[*] Successfully connected to MongoDB at {mongo_uri}")
    except Exception as e:
        print(f"[FATAL] Could not connect to MongoDB: {e}")
        sys.exit(1)

    db = client[E2E_DB_NAME]

    # 2. Clean collections
    collections_to_clean = [
        "users", "profiles", "jobs", "applications", "companies",
        "resumes", "posts", "notifications", "calendar_events",
        "messages", "conversations", "connections", "learning_progress",
        "revoked_tokens", "resume_analyses"
    ]
    print("[*] Cleaning existing E2E test data...")
    for col in collections_to_clean:
        db[col].delete_many({})
    print("[*] All E2E collections wiped successfully.")

    # 3. Ensure uploads directory is isolated
    upload_dir = Path("uploads_e2e")
    upload_dir.mkdir(parents=True, exist_ok=True)
    for f in upload_dir.glob("*"):
        if f.is_file():
            try:
                f.unlink()
            except Exception:
                pass
    print(f"[*] Upload directory '{upload_dir}' prepared and cleaned.")

    # 4. Generate fixture directory and sample resume files
    fixtures_dir = Path("tests/fixtures")
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    # Generate sample PDF resume using reportlab
    pdf_path = fixtures_dir / "sample_resume.pdf"
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        c = canvas.Canvas(str(pdf_path), pagesize=letter)
        c.drawString(100, 750, "Alice Seeker - Senior Frontend Engineer")
        c.drawString(100, 730, "Email: seeker@careerx.test | San Francisco, CA")
        c.drawString(100, 700, "Professional Summary:")
        c.drawString(100, 680, "Experienced engineer with 5+ years building scalable React & TypeScript apps.")
        c.drawString(100, 650, "Core Skills: React, TypeScript, Tailwind CSS, JavaScript, Next.js, HTML, CSS")
        c.drawString(100, 620, "Experience: Lead Developer at WebScale (2021-Present)")
        c.save()
        print(f"[*] Generated valid test PDF resume at {pdf_path}")
    except Exception as e:
        print(f"[!] Warning generating PDF with reportlab: {e}")

    # Generate sample DOCX resume using python-docx
    docx_path = fixtures_dir / "sample_resume.docx"
    try:
        import docx
        doc = docx.Document()
        doc.add_heading("Alice Seeker - Senior Frontend Engineer", level=1)
        doc.add_paragraph("Email: seeker@careerx.com | San Francisco, CA")
        doc.add_paragraph("Experienced engineer with 5+ years building scalable React & TypeScript apps.")
        doc.add_paragraph("Core Skills: React, TypeScript, Tailwind CSS, JavaScript, Next.js, HTML, CSS")
        doc.save(str(docx_path))
        print(f"[*] Generated valid test DOCX resume at {docx_path}")
    except Exception as e:
        print(f"[!] Warning generating DOCX with docx: {e}")

    # 5. Seed Users
    hashed_pw = hash_password("Password123!")
    now_str = utc_now_iso()

    # User 1: Alice Seeker
    alice_res = db.users.insert_one({
        "email": "seeker@careerx.com",
        "passwordHash": hashed_pw,
        "role": "seeker",
        "isVerified": True,
        "isActive": True,
        "createdAt": now_str,
        "updatedAt": now_str,
    })
    alice_id = str(alice_res.inserted_id)
    db.users.update_one({"_id": alice_res.inserted_id}, {"$set": {"id": alice_id}})

    db.profiles.insert_one({
        "userId": alice_id,
        "name": "Alice Seeker",
        "email": "seeker@careerx.com",
        "headline": "Senior Frontend Engineer",
        "bio": "Passionate frontend engineer specializing in React and modern UI systems.",
        "location": "San Francisco, CA",
        "atsScore": 88,
        "skills": ["React", "TypeScript", "Tailwind CSS", "JavaScript", "HTML", "CSS"],
        "privacy": {
            "profileVisibility": "public",
            "resumeVisibility": "all_recruiters",
            "careerProgressVisibility": "public_showcase",
            "applicationPrivacy": True,
            "jobSearchStatus": "actively_looking",
            "showSalary": True,
            "salaryExpectation": "$150,000",
            "cloakCurrentEmployer": False,
            "contactVisibility": "all_recruiters"
        },
        "createdAt": now_str,
        "updatedAt": now_str,
    })

    # User 2: Bob Recruiter
    bob_res = db.users.insert_one({
        "email": "recruiter@careerx.com",
        "passwordHash": hashed_pw,
        "role": "recruiter",
        "company": "TechNova Solutions",
        "isVerified": True,
        "isActive": True,
        "createdAt": now_str,
        "updatedAt": now_str,
    })
    bob_id = str(bob_res.inserted_id)
    db.users.update_one({"_id": bob_res.inserted_id}, {"$set": {"id": bob_id}})

    db.profiles.insert_one({
        "userId": bob_id,
        "name": "Bob Recruiter",
        "email": "recruiter@careerx.com",
        "company": "TechNova Solutions",
        "headline": "Senior Talent Acquisition Partner",
        "bio": "Building world-class engineering teams at TechNova Solutions.",
        "location": "Austin, TX",
        "skills": ["Technical Recruiting", "Sourcing", "Executive Search", "Screening"],
        "privacy": {
            "profileVisibility": "public",
            "resumeVisibility": "all_recruiters",
            "careerProgressVisibility": "public_showcase",
            "applicationPrivacy": True,
            "jobSearchStatus": "not_looking",
            "showSalary": False,
            "cloakCurrentEmployer": False,
            "contactVisibility": "all_recruiters"
        },
        "createdAt": now_str,
        "updatedAt": now_str,
    })

    # User 3: Charlie Seeker (Multi-user privacy testing)
    charlie_res = db.users.insert_one({
        "email": "seeker2@careerx.com",
        "passwordHash": hashed_pw,
        "role": "seeker",
        "isVerified": True,
        "isActive": True,
        "createdAt": now_str,
        "updatedAt": now_str,
    })
    charlie_id = str(charlie_res.inserted_id)
    db.users.update_one({"_id": charlie_res.inserted_id}, {"$set": {"id": charlie_id}})

    db.profiles.insert_one({
        "userId": charlie_id,
        "name": "Charlie Seeker",
        "email": "seeker2@careerx.com",
        "headline": "Distributed Systems Engineer",
        "bio": "Backend specialist focused on high-throughput microservices.",
        "location": "New York, NY",
        "atsScore": 82,
        "skills": ["Python", "FastAPI", "Docker", "Kubernetes", "MongoDB", "PostgreSQL"],
        "privacy": {
            "profileVisibility": "public",
            "resumeVisibility": "applied_only",
            "careerProgressVisibility": "recruiters_only",
            "applicationPrivacy": True,
            "jobSearchStatus": "casually_browsing",
            "showSalary": True,
            "salaryExpectation": "$165,000",
            "cloakCurrentEmployer": False,
            "contactVisibility": "mutual_matches"
        },
        "createdAt": now_str,
        "updatedAt": now_str,
    })

    # User 4: Dave Admin
    admin_res = db.users.insert_one({
        "email": "admin@careerx.com",
        "passwordHash": hashed_pw,
        "role": "admin",
        "isVerified": True,
        "isActive": True,
        "createdAt": now_str,
        "updatedAt": now_str,
    })
    admin_id = str(admin_res.inserted_id)
    db.users.update_one({"_id": admin_res.inserted_id}, {"$set": {"id": admin_id}})

    db.profiles.insert_one({
        "userId": admin_id,
        "name": "System Administrator",
        "email": "admin@careerx.com",
        "headline": "CareerX Platform Operations & Governance",
        "bio": "Overseeing system health, platform integrity, user lifecycles, and compliance.",
        "location": "San Francisco, CA",
        "company": "CareerX",
        "atsScore": 99,
        "skills": ["Security", "Observability", "Platform Governance"],
        "privacy": {
            "profileVisibility": "public",
            "resumeVisibility": "all_recruiters",
            "careerProgressVisibility": "public_showcase",
            "applicationPrivacy": False,
            "jobSearchStatus": "not_looking",
            "showSalary": False,
            "cloakCurrentEmployer": False,
            "contactVisibility": "all_recruiters"
        },
        "createdAt": now_str,
        "updatedAt": now_str,
    })

    # 6. Seed Company: TechNova Solutions
    comp_doc = {
        "id": "comp-technova",
        "name": "TechNova Solutions",
        "slug": "technova-solutions",
        "tagline": "Pioneering enterprise cloud intelligence",
        "logoInitials": "TN",
        "logoGradient": "from-cyan-500 to-blue-600",
        "industry": "Technology",
        "size": "50-200",
        "headquarters": "Austin, TX",
        "foundedYear": "2019",
        "fundingStage": "Series B",
        "websiteUrl": "https://technova.example.com",
        "about": "TechNova Solutions delivers mission-critical distributed systems and enterprise cloud tools.",
        "mission": "Empowering developers with real-time observability and cloud developer environments.",
        "techStack": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker"],
        "benefits": ["Remote-First Culture", "Full Health & Dental", "401k Matching", "Learning Stipend"],
        "openJobsCount": 1,
        "followersCount": 128,
        "ownerId": bob_id,
        "recruiterIds": [bob_id],
        "employees": [
            {
                "id": bob_id,
                "name": "Bob Recruiter",
                "role": "Senior Talent Acquisition Partner",
                "avatarInitials": "BR",
                "avatarGradient": "from-purple-500 to-indigo-600",
                "isConnected": False
            }
        ],
        "posts": [],
        "jobs": [],
        "createdAt": now_str,
        "updatedAt": now_str,
    }
    db.companies.insert_one(comp_doc)

    # 7. Seed Job Listing: Senior Frontend Engineer
    job_doc = {
        "id": "job-technova-fe",
        "title": "Senior Frontend Engineer",
        "company": "TechNova Solutions",
        "companyName": "TechNova Solutions",
        "companyId": "comp-technova",
        "location": "Remote - US",
        "salaryRange": "$140,000 - $170,000",
        "salaryMin": 140000,
        "salaryMax": 170000,
        "workType": "Remote",
        "jobType": "Full-time",
        "experienceLevel": "Senior",
        "roleCategory": "Software Engineering",
        "skills": [
            {"name": "React", "isMatched": True},
            {"name": "TypeScript", "isMatched": True},
            {"name": "Tailwind CSS", "isMatched": True},
            {"name": "JavaScript", "isMatched": True}
        ],
        "requiredSkills": ["React", "TypeScript", "Tailwind CSS", "JavaScript"],
        "description": "We are seeking an experienced Frontend Engineer to architect responsive user experiences, build modular React components, and partner with backend engineers.",
        "responsibilities": [
            "Design and implement accessible, responsive user interfaces in React",
            "Maintain high-quality component libraries and front-end architectures",
            "Collaborate with product and backend teams to integrate REST & WebSocket APIs"
        ],
        "qualifications": [
            "5+ years frontend development experience",
            "Strong proficiency with React, TypeScript, and modern CSS",
            "Experience with state management and automated testing"
        ],
        "benefits": ["Flexible PTO", "Annual Tech Allowance", "Comprehensive Health Coverage"],
        "applicantsCount": 0,
        "isActive": True,
        "status": "published",
        "postedBy": bob_id,
        "recruiterId": bob_id,
        "postedDate": now_str,
        "postedAgo": "Just now",
        "createdAt": now_str,
        "updatedAt": now_str,
    }
    db.jobs.insert_one(job_doc)

    # 8. Seed Calendar Event for Alice
    db.calendar_events.insert_one({
        "id": "evt-alice-prep",
        "userId": alice_id,
        "title": "CareerX Technical Interview Prep",
        "date": "2026-09-20",
        "time": "11:00 AM",
        "type": "Interview",
        "company": "TechNova Solutions",
        "locationOrUrl": "Google Meet",
        "description": "Review architecture principles and coding practices.",
        "location": "Google Meet",
        "status": "confirmed",
        "isSyncedWithGoogle": True,
        "createdAt": now_str,
        "updatedAt": now_str,
    })

    # 9. Seed Initial Community Post for Feed
    post_res = db.posts.insert_one({
        "authorId": alice_id,
        "userId": alice_id,
        "author": {
            "id": alice_id,
            "name": "Alice Seeker",
            "headline": "Senior Frontend Engineer",
            "avatarInitials": "AS",
            "avatarGradient": "from-brand-600 to-indigo-800",
            "isVerified": True,
        },
        "authorName": "Alice Seeker",
        "authorHeadline": "Senior Frontend Engineer",
        "type": "Technical Discussion",
        "content": "Excited to share that I just finished updating my portfolio with React 18 and Tailwind CSS! #webdev #frontend",
        "likes": [],
        "likesCount": 0,
        "comments": [],
        "commentsCount": 0,
        "mediaUrls": [],
        "createdAt": now_str,
        "updatedAt": now_str,
    })
    post_id = str(post_res.inserted_id)
    db.posts.update_one({"_id": post_res.inserted_id}, {"$set": {"id": post_id}})

    print("==================================================")
    print("  CAREERX E2E SEED COMPLETED SUCCESSFULLY")
    print(f"  Alice Seeker:     seeker@careerx.com     (ID: {alice_id})")
    print(f"  Bob Recruiter:    recruiter@careerx.com  (ID: {bob_id})")
    print(f"  Charlie Seeker:   seeker2@careerx.com    (ID: {charlie_id})")
    print(f"  TechNova Job:     job-technova-fe")
    print(f"  Sample Post:      {post_id}")
    print("==================================================")

if __name__ == "__main__":
    main()
