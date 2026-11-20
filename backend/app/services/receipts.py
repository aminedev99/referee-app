import os
from datetime import datetime
from num2words import num2words
from reportlab.lib.pagesizes import A4
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
    if "aide" in f_lower and "marqu" in f_lower:
        return "AIDE MARQUEUR"
    if "1 er" in f_lower or "1er" in f_lower or "principal 1" in f_lower:
        return "1ER ARBITRE"
    if "2 ème" in f_lower or "2ème" in f_lower or "2eme" in f_lower or "principal 2" in f_lower:
        return "2ÈME ARBITRE"
    if "24" in f_lower:
        return "OPÉRATEUR 24S"
    if "chrono" in f_lower or "timer" in f_lower:
        return "CHRONOMÉTREUR"
    if "marqu" in f_lower or "scorer" in f_lower:
        return "MARQUEUR"
    if "second" in f_lower or "assistant" in f_lower:
        return "2ÈME ARBITRE"
    if "principal" in f_lower or "main" in f_lower or "lead" in f_lower:
        return "1ER ARBITRE"
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

def _draw_single_receipt(
    c: canvas.Canvas,
    page_width: float,
    y_top: float,
    paying_team_name: str,
    amount_val: float,
    civility: str,
    referee_name: str,
    func_fr: str,
    home_name: str,
    away_name: str,
    category_name: str,
    place_name: str,
    date_formatted: str,
    time_formatted: str,
    issue_date: str,
    ldtbb_logo: str,
    frmbb_logo: str,
    cachet_img: str,
) -> None:
    NAVY = colors.HexColor("#1B314E")
    WHITE = colors.HexColor("#FFFFFF")

    # 1. Left Logo (LDTBB)
    if ldtbb_logo and os.path.exists(ldtbb_logo):
        lx = 24.0
        lw = 46.0
        lh = 54.0
        ly = y_top - 62.0
        c.drawImage(ldtbb_logo, lx, ly, width=lw, height=lh, mask="auto")

    # 2. Right Logo (FRMBB)
    if frmbb_logo and os.path.exists(frmbb_logo):
        rw = 46.0
        rx = page_width - 24.0 - rw
        rh = 54.0
        ry = y_top - 62.0
        c.drawImage(frmbb_logo, rx, ry, width=rw, height=rh, mask="auto")

    # 3. Top Header Text (Between logos)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 10.0)
    c.drawCentredString(page_width / 2.0, y_top - 17.0, "FÉDÉRATION ROYALE MAROCAINE DE BASKET-BALL")
    c.setFont("Helvetica-Bold", 11.5)
    c.drawCentredString(page_width / 2.0, y_top - 31.0, "LIGUE DARAÂ-TAFILALET")

    # 4. Box 1: COMMISSION D'ARBITRAGE
    b1_x = 88.0
    b1_w = page_width - 176.0
    b1_h = 19.0
    b1_y = y_top - 57.0
    c.setFillColor(NAVY)
    c.rect(b1_x, b1_y, b1_w, b1_h, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12.0)
    c.drawCentredString(page_width / 2.0, b1_y + 4.5, "COMMISSION D’ARBITRAGE")

    # 5. Box 2: REÇU
    b2_x = 24.0
    b2_w = page_width - 48.0
    b2_h = 22.0
    b2_y = y_top - 84.0
    c.setFillColor(NAVY)
    c.rect(b2_x, b2_y, b2_w, b2_h, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Times-Bold", 14.5)
    c.drawCentredString(page_width / 2.0, b2_y + 5.0, "REÇU")

    # 6. Format Body text
    qualite_prefix = "d’" if func_fr[0] in "AEIOUYHÉÈ" else "de "
    amount_int = int(amount_val)
    amount_words = num2words(amount_int, lang="fr").upper()
    amount_digits = str(amount_int if float(amount_val).is_integer() else f"{amount_val:.2f}")

    body_text = (
        f"Je soussigné(e) {civility} {referee_name}, en qualité {qualite_prefix}{func_fr}, "
        f"reconnais avoir reçu du club {paying_team_name} la somme de {amount_words} ({amount_digits}) "
        f"dirhams, comme frais et indemnités d’arbitrage, au titre de la rencontre: "
        f"{home_name}  #  {away_name}, catégorie {category_name}, qui aura lieu à {place_name}, le {date_formatted}  à "
        f"{time_formatted}."
    )

    style = ParagraphStyle(
        name=f"ReceiptBody_{y_top}",
        fontName="Times-Bold",
        fontSize=10.5,
        leading=17.5,
        textColor=NAVY,
        alignment=TA_JUSTIFY,
        firstLineIndent=22,
    )

    p_w = page_width - 48.0
    p = Paragraph(body_text, style)
    _, h_used = p.wrap(p_w, 180)
    p_x = 24.0
    p_y = y_top - 94.0 - h_used
    p.drawOn(c, p_x, p_y)

    # 7. Date Line
    c.setFillColor(NAVY)
    c.setFont("Times-Bold", 10.5)
    date_y = p_y - 20.0
    c.drawCentredString(page_width / 2.0, date_y, f"Fait à {place_name}, le : {issue_date}.")

    # 8. Signature Headers
    sig_y = date_y - 22.0
    c.setFont("Times-Bold", 10.5)

    sig_label_left = "Signature de l’arbitre :"
    sig_x_left = 65.0
    c.drawString(sig_x_left, sig_y, sig_label_left)
    text_w_left = c.stringWidth(sig_label_left, "Times-Bold", 10.5)
    c.setStrokeColor(NAVY)
    c.setLineWidth(1.0)
    c.line(sig_x_left, sig_y - 2, sig_x_left + text_w_left, sig_y - 2)

    sig_label_right = "Validation / cachet :"
    sig_x_right = page_width - 195.0
    c.drawString(sig_x_right, sig_y, sig_label_right)
    text_w_right = c.stringWidth(sig_label_right, "Times-Bold", 10.5)
    c.line(sig_x_right, sig_y - 2, sig_x_right + text_w_right, sig_y - 2)

    # 9. Stamp
    if cachet_img and os.path.exists(cachet_img):
        stamp_w = 68.0
        stamp_h = 62.0
        stamp_x = sig_x_right + 18.0
        stamp_y = sig_y - stamp_h - 4.0
        c.drawImage(cachet_img, stamp_x, stamp_y, width=stamp_w, height=stamp_h, mask="auto")

def generate_receipt_pdf(
    receipt: Receipt,
    assignment: Assignment,
    referee: Referee,
    match: Match,
    paying_team: Team = None,
) -> str:
    os.makedirs(settings.RECEIPTS_DIR, exist_ok=True)
    pdf_path = os.path.join(settings.RECEIPTS_DIR, f"{receipt.id}.pdf")

    # Single A4 Portrait page (595.28 x 841.89 pt) containing 2 receipts: Home on top, Away on bottom
    width, height = A4
    c = canvas.Canvas(pdf_path, pagesize=(width, height), pageCompression=0)

    # Asset paths
    ldtbb_logo = find_template_asset("ldtbb.png")
    frmbb_logo = find_template_asset("frmbb.png")
    cachet_img = find_template_asset("cachet.png")

    # Format Common Variables
    referee_name = referee.name if referee else "Arbitre"
    raw_func = assignment.referee_function if assignment else "Arbitre"
    func_fr = format_referee_function_fr(raw_func)

    # Automatic civility according to referee's gender: Homme -> MR, Femme -> MS
    ref_gender = getattr(referee, "gender", "Homme") or "Homme"
    civility = "MS" if ref_gender.strip().lower() in ("femme", "f", "ms") else "MR"

    # Match Teams
    home_name = match.home_team.name if (match and match.home_team) else "Equipe Domicile"
    away_name = match.away_team.name if (match and match.away_team) else "Equipe Visiteuse"

    # Category: Seniors by default, or specific youth category (U19, U16, U14, U12, U10, U8)
    category_raw = getattr(match, "category", "") or "Seniors"
    c_lower = category_raw.strip().lower()
    if c_lower in ("men", "hommes", "seniors", "senior", "s"):
        category_name = "SENIORS"
    elif c_lower in ("women", "femmes"):
        category_name = "SENIORS"
    else:
        category_name = category_raw.strip().upper()
    place_name = (match.city or match.venue or "Errachidia") if match else "Errachidia"

    # Date & Time formatting
    date_formatted = datetime.now().strftime("%d/%m/%Y")
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
            time_formatted = t_clean[:5] if len(t_clean) >= 5 else t_clean

    # Issue date
    issue_date = datetime.now().strftime("%d/%m/%Y")
    if receipt and receipt.issued_at:
        for fmt in ("%d %b %Y", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                dt = datetime.strptime(receipt.issued_at, fmt)
                issue_date = dt.strftime("%d/%m/%Y")
                break
            except Exception:
                pass

    # Indemnities for Home and Away
    base_indemnity = float(assignment.indemnity) if (assignment and assignment.indemnity) else 0.0
    amount_home = float(getattr(assignment, "indemnity_home", None) or base_indemnity)
    amount_away = float(getattr(assignment, "indemnity_away", None) or base_indemnity)

    # 1. Top Receipt: Équipe Home
    top_y_top = height - 16.0
    _draw_single_receipt(
        c=c,
        page_width=width,
        y_top=top_y_top,
        paying_team_name=home_name,
        amount_val=amount_home,
        civility=civility,
        referee_name=referee_name,
        func_fr=func_fr,
        home_name=home_name,
        away_name=away_name,
        category_name=category_name,
        place_name=place_name,
        date_formatted=date_formatted,
        time_formatted=time_formatted,
        issue_date=issue_date,
        ldtbb_logo=ldtbb_logo,
        frmbb_logo=frmbb_logo,
        cachet_img=cachet_img,
    )

    # Middle dashed cutting divider
    mid_y = height / 2.0
    c.setDash(4, 4)
    c.setStrokeColor(colors.HexColor("#A0AEC0"))
    c.setLineWidth(0.75)
    c.line(20.0, mid_y, width - 20.0, mid_y)
    c.setDash()
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#718096"))
    c.drawCentredString(width / 2.0, mid_y + 3.0, "✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂")

    # 2. Bottom Receipt: Équipe Away
    bottom_y_top = mid_y - 14.0
    _draw_single_receipt(
        c=c,
        page_width=width,
        y_top=bottom_y_top,
        paying_team_name=away_name,
        amount_val=amount_away,
        civility=civility,
        referee_name=referee_name,
        func_fr=func_fr,
        home_name=home_name,
        away_name=away_name,
        category_name=category_name,
        place_name=place_name,
        date_formatted=date_formatted,
        time_formatted=time_formatted,
        issue_date=issue_date,
        ldtbb_logo=ldtbb_logo,
        frmbb_logo=frmbb_logo,
        cachet_img=cachet_img,
    )

    c.save()
    return pdf_path
