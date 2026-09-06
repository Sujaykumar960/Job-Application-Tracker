from app.utils.privacy import sanitize_candidate_privacy

BASE_CANDIDATE = {
    "id": "cand_99",
    "name": "Jordan Lee",
    "role": "Staff Platform Engineer",
    "avatarInitials": "JL",
    "avatarGradient": "from-cyan-500 to-blue-600",
    "privacy": {
        "searchStatus": "actively_looking",
        "showSalary": True,
        "salaryExpectation": "$190,000 - $220,000",
        "contactVisibility": "all_recruiters",
        "email": "jordan.lee@example.com",
        "phone": "+1 206-555-0188",
        "cloakedFromCurrentEmployer": True,
        "currentEmployer": "Meta",
    },
}


def test_privacy_hidden_contact():
    candidate = dict(BASE_CANDIDATE)
    candidate["privacy"] = dict(BASE_CANDIDATE["privacy"])
    candidate["privacy"]["contactVisibility"] = "hidden"

    sanitized = sanitize_candidate_privacy(candidate, viewer_role="recruiter")
    assert sanitized["privacy"]["email"] == "[Contact Hidden by Candidate]"
    assert sanitized["privacy"]["phone"] is None


def test_privacy_mutual_matches_only():
    candidate = dict(BASE_CANDIDATE)
    candidate["privacy"] = dict(BASE_CANDIDATE["privacy"])
    candidate["privacy"]["contactVisibility"] = "mutual_matches"

    # Without mutual match
    no_match = sanitize_candidate_privacy(candidate, viewer_role="recruiter", is_mutual_match=False)
    assert no_match["privacy"]["email"] == "[Visible upon Mutual Match]"
    assert no_match["privacy"]["phone"] is None

    # With mutual match
    with_match = sanitize_candidate_privacy(candidate, viewer_role="recruiter", is_mutual_match=True)
    assert with_match["privacy"]["email"] == "jordan.lee@example.com"
    assert with_match["privacy"]["phone"] == "+1 206-555-0188"


def test_privacy_salary_undisclosed():
    candidate = dict(BASE_CANDIDATE)
    candidate["privacy"] = dict(BASE_CANDIDATE["privacy"])
    candidate["privacy"]["showSalary"] = False

    sanitized = sanitize_candidate_privacy(candidate, viewer_role="recruiter")
    assert sanitized["privacy"]["salaryExpectation"] == "[Undisclosed by Candidate]"


def test_privacy_employer_cloaking():
    candidate = dict(BASE_CANDIDATE)
    candidate["privacy"] = dict(BASE_CANDIDATE["privacy"])

    # Recruiter from same company (Meta)
    cloaked = sanitize_candidate_privacy(candidate, viewer_role="recruiter", viewer_company="Meta Platforms")
    assert cloaked["name"] == "Confidential Candidate"
    assert cloaked["avatarInitials"] == "CC"
    assert "Confidential" in cloaked["privacy"]["currentEmployer"]

    # Recruiter from different company (Stripe)
    uncloaked = sanitize_candidate_privacy(candidate, viewer_role="recruiter", viewer_company="Stripe")
    assert uncloaked["name"] == "Jordan Lee"
    assert uncloaked["privacy"]["currentEmployer"] == "Meta"


def test_privacy_admin_or_self_bypass():
    candidate = dict(BASE_CANDIDATE)
    candidate["privacy"] = dict(BASE_CANDIDATE["privacy"])
    candidate["privacy"]["contactVisibility"] = "hidden"
    candidate["privacy"]["showSalary"] = False

    # Admin view
    admin_view = sanitize_candidate_privacy(candidate, viewer_role="admin")
    assert admin_view["privacy"]["email"] == "jordan.lee@example.com"
    assert admin_view["privacy"]["salaryExpectation"] == "$190,000 - $220,000"

    # Self view
    self_view = sanitize_candidate_privacy(candidate, viewer_role="seeker", viewer_id="cand_99")
    assert self_view["privacy"]["email"] == "jordan.lee@example.com"
