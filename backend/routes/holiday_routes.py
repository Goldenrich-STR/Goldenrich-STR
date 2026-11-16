"""Indian public holidays and big festivals for the date pickers.

Dates are worked out for any year (Hindu and Islamic calendars included) by the open source
`holidays` package, so the calendar follows the year without anyone updating a list.
"""
from functools import lru_cache
from typing import Dict

import holidays
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/holidays", tags=["Holidays"])

# festivals that are not public holidays but guests plan trips around
EXTRA_FESTIVALS = (
    "Makar Sankranti",
    "Maha Shivaratri",
    "Gudi Padwa",
    "Raksha Bandhan",
    "Ganesh Chaturthi",
    "Bhai Duj",
    "Onam",
    "Rath Yatra",
)


def _first_name(raw: str) -> str:
    name = raw.split(";")[0].strip()
    # "Janmashtami (Vaishnava)" -> "Janmashtami", "Eid al-Fitr (estimated)" -> "Eid al-Fitr"
    if "(" in name:
        name = name.split("(")[0].strip()
    return name


def _extra_name(raw: str) -> str:
    for part in raw.split(";"):
        part = part.strip()
        if any(key.lower() in part.lower() for key in EXTRA_FESTIVALS):
            return _first_name(part.replace(" / Vinayak Chaturthi", ""))
    return ""


@lru_cache(maxsize=64)
def _holidays_for(year: int) -> Dict[str, str]:
    result: Dict[str, str] = {}
    public = holidays.India(years=year, categories=("public",), language="en_US")
    for day, raw in public.items():
        result[day.isoformat()] = _first_name(raw)
    optional = holidays.India(years=year, categories=("optional",), language="en_US")
    for day, raw in optional.items():
        iso = day.isoformat()
        if iso in result:
            continue
        name = _extra_name(raw)
        if name:
            result[iso] = name
    return dict(sorted(result.items()))


@router.get("/{year}")
async def get_holidays(year: int):
    """Holidays and festivals of one year as {"YYYY-MM-DD": "Name"}."""
    if year < 2000 or year > 2100:
        raise HTTPException(status_code=400, detail="Year must be between 2000 and 2100")
    return {"year": year, "country": "IN", "holidays": _holidays_for(year)}
