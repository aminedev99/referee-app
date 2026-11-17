import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from app.deps import get_db, require_admin, get_current_user
from app.models import Assignment, Receipt, User, Match, Referee, Team
from app.schemas import ReceiptOut
from app.services.receipts import generate_receipt_pdf, get_amount_in_words_fr
from app.services.notifications import notify

router = APIRouter(prefix="/assignments", tags=["receipts"], dependencies=[Depends(get_current_user)])

@router.post("/{id}/receipt", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
def create_receipt(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> ReceiptOut:
    assignment = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.referee),
            joinedload(Assignment.paying_team),
            joinedload(Assignment.receipt),
        )
        .filter(Assignment.id == id)
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    # Idempotent: return existing receipt if already generated (regenerating fresh PDF with latest template)
    if assignment.receipt:
        rcpt = assignment.receipt
        pdf_path = generate_receipt_pdf(
            receipt=rcpt,
            assignment=assignment,
            referee=assignment.referee,
            match=assignment.match,
            paying_team=assignment.paying_team,
        )
        rcpt.pdf_path = pdf_path
        db.commit()
        return ReceiptOut(
            id=rcpt.id,
            assignment_id=assignment.id,
            receipt_number=rcpt.receipt_number,
            number=rcpt.number or rcpt.receipt_number,
            issued_at=rcpt.issued_at,
            amount=rcpt.amount,
            amount_in_words=rcpt.amount_in_words,
            pdf_url=f"/api/assignments/{assignment.id}/receipt.pdf",
        )

    if assignment.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Receipt can only be generated for confirmed assignments",
        )

    now = datetime.now()
    year = now.year

    # Sequential per year computed inside transaction
    existing_receipts = db.query(Receipt.number).filter(Receipt.number.like(f"{year}-%")).all()
    max_seq = 0
    for (num_str,) in existing_receipts:
        if num_str:
            try:
                seq = int(num_str.split("-")[1])
                if seq > max_seq:
                    max_seq = seq
            except (IndexError, ValueError):
                pass
    next_seq = max_seq + 1
    receipt_num = f"{year}-{next_seq:04d}"

    issued_date_str = now.strftime("%d %b %Y")
    amount_words = get_amount_in_words_fr(assignment.indemnity)

    receipt = Receipt(
        assignment_id=assignment.id,
        receipt_number=receipt_num,
        number=receipt_num,
        issued_at=issued_date_str,
        amount=float(assignment.indemnity),
        amount_in_words=amount_words,
        pdf_path="",
    )
    db.add(receipt)
    db.flush()

    # Generate PDF
    pdf_path = generate_receipt_pdf(
        receipt=receipt,
        assignment=assignment,
        referee=assignment.referee,
        match=assignment.match,
        paying_team=assignment.paying_team,
    )
    receipt.pdf_path = pdf_path

    # Notify referee
    if assignment.referee and assignment.referee.user_id:
        match_str = f"{assignment.match.home_team.name} vs {assignment.match.away_team.name}" if assignment.match else "Match"
        notify(
            db,
            assignment.referee.user_id,
            f"Receipt available: {match_str}",
            type="receipt",
            title="Receipt available",
        )

    db.commit()
    db.refresh(receipt)

    return ReceiptOut(
        id=receipt.id,
        assignment_id=receipt.assignment_id,
        receipt_number=receipt.receipt_number,
        number=receipt.number,
        issued_at=receipt.issued_at,
        amount=receipt.amount,
        amount_in_words=receipt.amount_in_words,
        pdf_url=f"/api/assignments/{assignment.id}/receipt.pdf",
    )

@router.get("/{id}/receipt", response_model=ReceiptOut)
def get_receipt(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReceiptOut:
    assignment = (
        db.query(Assignment)
        .options(joinedload(Assignment.receipt), joinedload(Assignment.referee))
        .filter(Assignment.id == id)
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    if current_user.role != "admin":
        if not assignment.referee or assignment.referee.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this receipt",
            )

    receipt = assignment.receipt
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found for this assignment",
        )

    return ReceiptOut(
        id=receipt.id,
        assignment_id=receipt.assignment_id,
        receipt_number=receipt.receipt_number,
        number=receipt.number or receipt.receipt_number,
        issued_at=receipt.issued_at,
        amount=receipt.amount,
        amount_in_words=receipt.amount_in_words,
        pdf_url=f"/api/assignments/{assignment.id}/receipt.pdf",
    )

@router.get("/{id}/receipt.pdf")
def get_receipt_pdf(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = (
        db.query(Assignment)
        .options(
            joinedload(Assignment.receipt),
            joinedload(Assignment.referee),
            joinedload(Assignment.match).joinedload(Match.home_team),
            joinedload(Assignment.match).joinedload(Match.away_team),
            joinedload(Assignment.paying_team),
        )
        .filter(Assignment.id == id)
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    if current_user.role != "admin":
        if not assignment.referee or assignment.referee.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to download this receipt",
            )

    receipt = assignment.receipt
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt PDF not found",
        )

    # Regenerate fresh PDF so latest design is always served
    pdf_path = generate_receipt_pdf(
        receipt=receipt,
        assignment=assignment,
        referee=assignment.referee,
        match=assignment.match,
        paying_team=assignment.paying_team,
    )
    receipt.pdf_path = pdf_path
    db.commit()

    filename = f"recu_{receipt.receipt_number.replace('/', '_')}.pdf"
    return FileResponse(
        path=receipt.pdf_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
