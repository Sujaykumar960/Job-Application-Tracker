from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional, Tuple, Union
from bson import ObjectId


def utc_now() -> datetime:
    """Return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    """Return current UTC time in ISO 8601 string format."""
    return datetime.now(timezone.utc).isoformat()


def serialize_mongo_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert MongoDB _id to string 'id' and serialize nested ObjectIds and datetimes."""
    if doc is None:
        return None

    result = dict(doc)
    if "_id" in result:
        if not result.get("id"):
            result["id"] = str(result["_id"])
        result.pop("_id", None)

    for key, value in list(result.items()):
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [
                serialize_mongo_doc(item) if isinstance(item, dict)
                else str(item) if isinstance(item, ObjectId)
                else item.isoformat() if isinstance(item, datetime)
                else item
                for item in value
            ]
        elif isinstance(value, dict):
            result[key] = serialize_mongo_doc(value)

    return result


def serialize_mongo_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Serialize a list of MongoDB documents."""
    return [serialize_mongo_doc(doc) for doc in docs if doc is not None]  # type: ignore


def parse_salary_range(salary_str: Optional[str]) -> Tuple[Optional[int], Optional[int]]:
    """Parse numeric min and max salary from string e.g. '$175,000 - $215,000' or '₹22,00,000'."""
    if not salary_str:
        return None, None
    matches = re.findall(r"\b\d[\d,]*\b", salary_str)
    numbers = []
    for m in matches:
        clean = m.replace(",", "")
        if clean.isdigit():
            numbers.append(int(clean))
    if not numbers:
        return None, None
    if len(numbers) == 1:
        return numbers[0], numbers[0]
    return min(numbers), max(numbers)
