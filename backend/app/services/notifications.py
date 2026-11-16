from typing import Union, List, Optional
from sqlalchemy.orm import Session
from app.models import Notification

def notify(
    db: Session,
    user_ids: Union[List[str], str],
    message: str,
    type: str = "assignment",
    title: Optional[str] = None,
) -> List[Notification]:
    if isinstance(user_ids, str):
        user_ids = [user_ids]

    if not title:
        type_titles = {
            "assignment": "New assignment",
            "confirmation": "Assignment confirmed",
            "confirmed": "Assignment confirmed",
            "refusal": "Assignment refused",
            "refused": "Assignment refused",
            "receipt": "Receipt available",
        }
        title = type_titles.get(type, "Notification")

    created = []
    for uid in user_ids:
        notif = Notification(
            user_id=uid,
            title=title,
            description=message,
            read=False,
            type=type,
        )
        db.add(notif)
        created.append(notif)

    return created
