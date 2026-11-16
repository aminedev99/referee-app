from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_user
from app.models import Notification, User
from app.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[NotificationOut]:
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [
        NotificationOut(
            id=n.id,
            user_id=n.user_id,
            title=n.title,
            description=n.description,
            read=n.read,
            type=n.type,
            created_at=n.created_at.strftime("%d %b %H:%M") if n.created_at else "",
        )
        for n in notifs
    ]

@router.post("/{id}/read", response_model=NotificationOut)
def mark_notification_read(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationOut:
    notif = (
        db.query(Notification)
        .filter(Notification.id == id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notif.read = True
    db.commit()
    db.refresh(notif)

    return NotificationOut(
        id=notif.id,
        user_id=notif.user_id,
        title=notif.title,
        description=notif.description,
        read=notif.read,
        type=notif.type,
        created_at=notif.created_at.strftime("%d %b %H:%M") if notif.created_at else "",
    )

@router.post("/read-all", response_model=List[NotificationOut])
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[NotificationOut]:
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .all()
    )
    for n in notifs:
        n.read = True
    db.commit()

    all_notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [
        NotificationOut(
            id=n.id,
            user_id=n.user_id,
            title=n.title,
            description=n.description,
            read=n.read,
            type=n.type,
            created_at=n.created_at.strftime("%d %b %H:%M") if n.created_at else "",
        )
        for n in all_notifs
    ]
