import copy
from typing import Any, Dict, Optional


def is_candidate_cloaked_from_recruiter(privacy: Dict[str, Any], recruiter_company: Optional[str]) -> bool:
    """Check if candidate is cloaked from a recruiter based on matching currentEmployer."""
    if not privacy.get("cloakedFromCurrentEmployer", False):
        return False

    current_employer = (privacy.get("currentEmployer") or "").strip().lower()
    recruiter_co = (recruiter_company or "").strip().lower()

    if current_employer and recruiter_co:
        if current_employer in recruiter_co or recruiter_co in current_employer:
            return True
    return False


def sanitize_candidate_privacy(
    candidate_data: Dict[str, Any],
    viewer_role: str = "recruiter",
    viewer_id: Optional[str] = None,
    viewer_company: Optional[str] = None,
    is_mutual_match: bool = False,
    is_list_view: bool = False,
) -> Optional[Dict[str, Any]]:
    """Enforce candidate privacy directives when viewed by recruiters or peers.

    Protects:
    1. Search discovery status: 'not_looking' candidates are hidden from discovery.
    2. Employer cloaking: Candidate identifying info is confidentialized.
    3. Direct contact details (email/phone) based on contactVisibility.
    4. Salary expectation based on showSalary flag.
    """
    data = copy.deepcopy(candidate_data)
    privacy = data.get("privacy", {})

    candidate_user_id = data.get("userId") or data.get("id")
    # If viewer is admin or the candidate themselves, all fields remain visible
    if viewer_role == "admin" or (viewer_id and viewer_id == candidate_user_id):
        return data

    # 1. Undiscoverable check: not_looking candidates are completely hidden from recruiters
    if privacy.get("searchStatus") == "not_looking":
        return None

    # 2. Employer cloaking check
    cloaked = privacy.get("cloakedFromCurrentEmployer", False)
    current_employer = (privacy.get("currentEmployer") or "").strip()
    if cloaked and current_employer and viewer_company:
        curr_clean = current_employer.lower()
        view_clean = viewer_company.strip().lower()
        if curr_clean in view_clean or view_clean in curr_clean:
            data["name"] = "Confidential Candidate"
            data["avatarInitials"] = "CC"
            data["avatarGradient"] = "from-slate-600 to-gray-800"
            if "currentEmployer" in privacy:
                privacy["currentEmployer"] = "Leading Tech Company (Confidential)"
            data["isCloaked"] = True

    # 3. Direct Contact Details Visibility (Email & Phone)
    contact_visibility = privacy.get("contactVisibility", "all_recruiters")
    if contact_visibility == "hidden":
        privacy["email"] = "[Contact Hidden by Candidate]"
        privacy["phone"] = None
    elif contact_visibility == "mutual_matches" and not is_mutual_match:
        privacy["email"] = "[Visible upon Mutual Match]"
        privacy["phone"] = None
    elif is_list_view and contact_visibility != "all_recruiters":
        privacy["email"] = None
        privacy["phone"] = None
    elif viewer_role not in ["recruiter", "admin"]:
        privacy["email"] = "[Recruiters Only]"
        privacy["phone"] = None

    # 4. Salary Visibility
    if not privacy.get("showSalary", True):
        privacy["salaryExpectation"] = "[Undisclosed by Candidate]"

    data["privacy"] = privacy
    return data
