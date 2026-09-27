#!/usr/bin/env python3
"""
CareerX Production Packaging Utility
Creates a clean, production-ready ZIP package excluding local caches,
git history, virtual environments, node_modules, and real environment/secret files.
"""

import os
import zipfile
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ZIP = PROJECT_ROOT / "careerx-production-deploy.zip"

EXCLUDED_DIR_NAMES = {
    ".git",
    ".github",
    ".pytest_cache",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    "dist",
    "build",
    "playwright-report",
    "test-results",
    "uploads",
    "uploads_e2e",
    ".idea",
    ".vscode",
    "logs",
}

EXCLUDED_FILE_PATTERNS = [
    r"^\.env$",
    r"^\.env\..+$",             # Matches .env.production, .env.local, .env.e2e, etc.
    r".*\.pyc$",
    r".*\.pyo$",
    r".*\.log$",
    r"^\.DS_Store$",
    r".*\.swp$",
    r"^careerx-production-deploy\.zip$",
]

# Explicitly allowed example templates:
ALLOWED_ENV_TEMPLATES = {
    ".env.example",
    ".env.production.example",
}


def should_exclude(rel_path: Path) -> bool:
    # Check directory parts
    for part in rel_path.parts:
        if part in EXCLUDED_DIR_NAMES:
            return True

    filename = rel_path.name
    # Check if allowed template
    if filename in ALLOWED_ENV_TEMPLATES:
        return False

    for pattern in EXCLUDED_FILE_PATTERNS:
        if re.match(pattern, filename, re.IGNORECASE):
            return True

    return False


def build_package():
    print(f"Building clean production deployment package from: {PROJECT_ROOT}")
    if OUTPUT_ZIP.exists():
        OUTPUT_ZIP.unlink()

    included_count = 0
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PROJECT_ROOT):
            rel_dir = Path(root).relative_to(PROJECT_ROOT)

            # Skip excluded directory trees early
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIR_NAMES]

            for file in files:
                file_rel_path = rel_dir / file
                if not should_exclude(file_rel_path):
                    file_full_path = Path(root) / file
                    zipf.write(file_full_path, arcname=str(file_rel_path).replace("\\", "/"))
                    included_count += 1

    zip_size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print(f"\nSuccessfully generated: {OUTPUT_ZIP}")
    print(f"Total files packaged: {included_count}")
    print(f"Package size: {zip_size_mb:.2f} MB")

    # Verification pass: ensure no forbidden files entered
    print("\n--- Verifying Archive Security Contents ---")
    forbidden_found = []
    with zipfile.ZipFile(OUTPUT_ZIP, "r") as zipf:
        namelist = zipf.namelist()
        for name in namelist:
            base = os.path.basename(name)
            if base in {".env", ".env.production", ".env.local"} or ".git/" in name or "node_modules/" in name:
                forbidden_found.append(name)

    if forbidden_found:
        print(f"ERROR: Forbidden files detected in archive: {forbidden_found}")
        sys.exit(1)
    else:
        print("VERIFIED CLEAN: 0 forbidden files, 0 .git entries, 0 secrets, 0 node_modules.")


if __name__ == "__main__":
    build_package()
