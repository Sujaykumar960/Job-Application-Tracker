import os
from pathlib import Path
import re
from typing import Optional, Tuple

from fastapi import HTTPException, status

from app.config import settings

# Supported MIME signatures and magic byte prefixes
SUPPORTED_FILE_TYPES = {
    "application/pdf": {
        "extensions": [".pdf"],
        "check": lambda b: b.startswith(b"%PDF-"),
    },
    "image/png": {
        "extensions": [".png"],
        "check": lambda b: b.startswith(b"\x89PNG\r\n\x1a\n"),
    },
    "image/jpeg": {
        "extensions": [".jpg", ".jpeg"],
        "check": lambda b: b.startswith(b"\xff\xd8\xff"),
    },
    "image/gif": {
        "extensions": [".gif"],
        "check": lambda b: b.startswith(b"GIF87a") or b.startswith(b"GIF89a"),
    },
    "image/webp": {
        "extensions": [".webp"],
        "check": lambda b: len(b) >= 12 and b[:4] == b"RIFF" and b[8:12] == b"WEBP",
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        "extensions": [".docx"],
        "check": lambda b: b.startswith(b"PK\x03\x04"),
    },
    "application/msword": {
        "extensions": [".doc"],
        "check": lambda b: b.startswith(b"\xd0\xcf\x11\xe0"),
    },
}

# Inverted mapping: extension -> standard MIME
EXTENSION_TO_MIME = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
}


def sanitize_filename(filename: str) -> str:
    """Strip path components and dangerous characters from user-provided filename."""
    base_name = os.path.basename(filename)
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)
    return clean_name or "uploaded_file"


def validate_file_content(
    filename: str,
    content: bytes,
    claimed_content_type: Optional[str] = None,
    max_size_bytes: Optional[int] = None,
) -> Tuple[str, str]:
    """Validate file content using magic byte signatures and size constraints.
    
    Returns:
        (sanitized_filename, validated_content_type)
        
    Raises:
        HTTPException 413 if file exceeds maximum size.
        HTTPException 400 if file type is unsupported or magic bytes mismatch.
    """
    max_size = max_size_bytes or settings.MAX_UPLOAD_SIZE_BYTES
    if len(content) > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {max_mb} MB.",
        )

    if len(content) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is corrupted or empty.",
        )

    sanitized = sanitize_filename(filename)
    ext = Path(sanitized).suffix.lower()

    if ext not in EXTENSION_TO_MIME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {list(EXTENSION_TO_MIME.keys())}",
        )

    expected_mime = EXTENSION_TO_MIME[ext]
    type_info = SUPPORTED_FILE_TYPES.get(expected_mime)

    if not type_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format.",
        )

    # Magic byte verification
    is_valid_magic = type_info["check"](content)
    if not is_valid_magic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File content signature mismatch for '{ext}'. File header does not match claimed file type.",
        )

    return sanitized, expected_mime
