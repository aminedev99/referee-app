import os
from datetime import datetime
from num2words import num2words
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from app.config import settings
from app.models import Receipt, Assignment, Referee, Match, Team

def get_amount_in_words_fr(amount: float) -> str:
    whole = int(amount)
    cents = int(round((amount - whole) * 100))
    words = num2words(whole, lang="fr")
    if cents > 0:
        cents_words = num2words(cents, lang="fr")
        return f"{words} dirhams et {cents_words} centimes"
    return f"{words} dirhams"

def format_referee_function_fr(func: str) -> str:
    if not func:
        return "ARBITRE"
    f_lower = func.lower().strip()
    if "24" in f_lower:
        return "OPERATEUR DE 24”"
    if "chrono" in f_lower:
        return "CHRONOMÉTREUR"
    if "marqu" in f_lower:
        return "MARQUEUR"
    if "commissaire" in f_lower:
        return "COMMISSAIRE"
    if "principal" in f_lower or "main" in f_lower or "lead" in f_lower or "1er" in f_lower:
        return "ARBITRE PRINCIPAL"
    if "assistant" in f_lower or "2ème" in f_lower or "second" in f_lower:
        return "ARBITRE ASSISTANT"
    return func.upper()

def find_template_asset(filename: str) -> str:
    possible_dirs = [
        os.path.join(os.path.dirname(__file__), "..", "template"),
        os.path.join(os.path.dirname(__file__), "..", "..", "template"),
        "/code/template",
        "/code/app/template",
        os.path.abspath("template"),
        os.path.abspath("backend/app/template"),
    ]
    for d in possible_dirs:
        p = os.path.normpath(os.path.join(d, filename))
        if os.path.exists(p):
            return p
    return ""

def generate_receipt_pdf(
    receipt: Receipt,
    assignment: Assignment,
    referee: Referee,
    match: Match,
    paying_team: Team,
) -> str:
    os.makedirs(settings.RECEIPTS_DIR, exist_ok=True)
    pdf_path = os.path.join(settings.RECEIPTS_DIR, f"{receipt.id}.pdf")

    # Use landscape A4 (841.89 x 595.28 pt) matching template/REcu template.png
    width, height = landscape(A4)
    c = canvas.Canvas(pdf_path, pagesize=(width, height))

    # Reference template dimensions: 1108 x 775 px
    sx = width / 1108.0
    sy = height / 775.0

    NAVY = colors.HexColor("#1B314E")
    WHITE = colors.HexColor("#FFFFFF")

    # Asset paths
    ldtbb_logo = find_template_asset("ldtbb.png")
    frmbb_logo = find_template_asset("frmbb.png")
    cachet_img = find_template_asset("cachet.png")

    # 1. Left Logo (LDTBB)
    if ldtbb_logo and os.path.exists(ldtbb_logo):
        lx = 29 * sx
        lw = (159 - 29) * sx
        lh = (219 - 9) * sy
        ly = height - 219 * sy
        c.drawImage(ldtbb_logo, lx, ly, width=lw, height=lh, mask="auto")

    # 2. Right Logo (FRMBB)
    if frmbb_logo and os.path.exists(frmbb_logo):
        rx = 900 * sx
        rw = (1080 - 900) * sx
        rh = (219 - 16) * sy
        ry = height - 219 * sy
        c.drawImage(frmbb_logo, rx, ry, width=rw, height=rh, mask="auto")

    # 3. Top Header Text (Between logos)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 14.5)
    c.drawCentredString(width / 2.0, height - 52 * sy, "FÉDÉRATION ROYALE MAROCAINE DE BASKET-BALL")
    c.setFont("Helvetica-Bold", 16.5)
    c.drawCentredString(width / 2.0, height - 82 * sy, "LIGUE DARAÂ-TAFILALET")

    # 4. Box 1: COMMISSION D'ARBITRAGE
    b1_x = 173 * sx
    b1_w = (901 - 173) * sx
    b1_h = (215 - 116) * sy
    b1_y = height - 215 * sy
    c.setFillColor(NAVY)
    c.rect(b1_x, b1_y, b1_w, b1_h, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2.0, b1_y + (b1_h - 18) / 2.0 + 1, "COMMISSION D’ARBITRAGE")

    # 5. Box 2: REÇU
    b2_x = 33 * sx
    b2_w = (1080 - 33) * sx
    b2_h = (267 - 219) * sy
    b2_y = height - 267 * sy
    c.setFillColor(NAVY)
    c.rect(b2_x, b2_y, b2_w, b2_h, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Times-Bold", 23)
    c.drawCentredString(width / 2.0, b2_y + (b2_h - 17) / 2.0 + 1, "REÇU")

    # 6. Format Dynamic Variables
    referee_name = referee.name if referee else "Arbitre"
    raw_func = assignment.referee_function if assignment else "Arbitre"
    func_fr = format_referee_function_fr(raw_func)
    qualite_prefix = "d’" if func_fr[0] in "AEIOUYHÉÈ" else "de "

    paying_name = paying_team.name if paying_team else "Club Organisateur"

    amount_val = assignment.indemnity if assignment else 0.0
    amount_int = int(amount_val)
    amount_words = num2words(amount_int, lang="fr").upper()
    amount_digits = str(amount_int if float(amount_val).is_integer() else f"{amount_val:.2f}")

    home_name = match.home_team.name if (match and match.home_team) else "Equipe A"
    away_name = match.away_team.name if (match and match.away_team) else "Equipe B"
    category_name = (match.category or "SENIORS").upper() if match else "SENIORS"
    place_name = (match.city or match.venue or "Errachidia") if match else "Errachidia"

    # Date & Time formatting
    date_formatted = "15/11/2026"
    if match and match.date:
        d_val = match.date
        if hasattr(d_val, "strftime"):
            date_formatted = d_val.strftime("%d/%m/%Y")
        elif isinstance(d_val, str):
            try:
                dt = datetime.strptime(d_val[:10], "%Y-%m-%d")
                date_formatted = dt.strftime("%d/%m/%Y")
            except Exception:
                date_formatted = d_val

    time_formatted = "15H00"
    if match and match.time:
        t_val = match.time
        if hasattr(t_val, "strftime"):
            time_formatted = t_val.strftime("%HH%M")
        elif isinstance(t_val, str):
            t_clean = t_val.replace(":", "H")
            if len(t_clean) >= 5:
                time_formatted = t_clean[:5]
            else:
                time_formatted = t_clean

    # Issue date
    issue_date = datetime.now().strftime("%d/%m/%Y")
    if receipt and receipt.issued_at:
        try:
            # Try parsing various formats
            for fmt in ("%d %b %Y", "%Y-%m-%d", "%d/%m/%Y"):
                try:
                    dt = datetime.strptime(receipt.issued_at, fmt)
                    issue_date = dt.strftime("%d/%m/%Y")
                    break
                except Exception:
                    pass
        except Exception:
            pass

    body_text = (
        f"Je soussigné(e) Mr {referee_name}, en qualité {qualite_prefix}{func_fr}, "
        f"reconnais avoir reçu du club {paying_name} la somme de {amount_words} ({amount_digits}) "
        f"dirhammes, comme frais et indemnités d’arbitrage, au titre de la rencontre: "
        f"{home_name}  #  {away_name}, catégorie {category_name}, qui aura lieu à {place_name}, le {date_formatted}  à "
        f"{time_formatted}."
    )

    style = ParagraphStyle(
        name="ReceiptBody",
        fontName="Times-Bold",
        fontSize=19,
        leading=35,
        textColor=NAVY,
        alignment=TA_JUSTIFY,
        firstLineIndent=45,
    )

    p_w = (1077 - 36) * sx
    p = Paragraph(body_text, style)
    w_used, h_used = p.wrap(p_w, 280)
    p_x = 36 * sx
    p_y = height - 290 * sy - h_used
    p.drawOn(c, p_x, p_y)

    # 7. Date Line
    c.setFillColor(NAVY)
    c.setFont("Times-Bold", 15)
    date_y = height - 535 * sy
    c.drawCentredString(width / 2.0, date_y, f"Fait à {place_name}, le : {issue_date}.")

    # 8. Signature Headers
    sig_y = height - 580 * sy
    c.setFont("Times-Bold", 15)

    sig_label_left = "Signature de l’arbitre :"
    sig_x_left = 230 * sx
    c.drawString(sig_x_left, sig_y, sig_label_left)
    text_w_left = c.stringWidth(sig_label_left, "Times-Bold", 15)
    c.setStrokeColor(NAVY)
    c.setLineWidth(1.2)
    c.line(sig_x_left, sig_y - 2, sig_x_left + text_w_left, sig_y - 2)

    sig_label_right = "Validation / cachet :"
    sig_x_right = 761 * sx
    c.drawString(sig_x_right, sig_y, sig_label_right)
    text_w_right = c.stringWidth(sig_label_right, "Times-Bold", 15)
    c.line(sig_x_right, sig_y - 2, sig_x_right + text_w_right, sig_y - 2)

    # 9. Stamp
    if cachet_img and os.path.exists(cachet_img):
        stamp_x = 831 * sx
        stamp_w = (963 - 831) * sx
        stamp_h = (767 - 606) * sy
        stamp_y = height - 767 * sy
        c.drawImage(cachet_img, stamp_x, stamp_y, width=stamp_w, height=stamp_h, mask="auto")

    c.save()
    return pdf_path
