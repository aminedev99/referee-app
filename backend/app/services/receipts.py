import os
from num2words import num2words
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
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

def generate_receipt_pdf(
    receipt: Receipt,
    assignment: Assignment,
    referee: Referee,
    match: Match,
    paying_team: Team,
) -> str:
    os.makedirs(settings.RECEIPTS_DIR, exist_ok=True)
    pdf_path = os.path.join(settings.RECEIPTS_DIR, f"{receipt.id}.pdf")

    width, height = A4
    c = canvas.Canvas(pdf_path, pagesize=A4)

    # Document Header
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(colors.HexColor("#C2410C")) # Brand color
    c.drawString(50, height - 70, "REÇU D'INDEMNITÉ D'ARBITRAGE")

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#5B6472"))
    c.drawString(50, height - 88, "Fédération / Ligue de Basketball • Referee Manager")

    c.setStrokeColor(colors.HexColor("#E5E1DA"))
    c.setLineWidth(1)
    c.line(50, height - 100, width - 50, height - 100)

    # Metadata Block
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#111827"))
    c.drawString(50, height - 130, f"N° de Reçu : {receipt.receipt_number}")
    c.setFont("Helvetica", 11)
    c.drawString(width - 220, height - 130, f"Date d'émission : {receipt.issued_at}")

    # Section 1: Official Details
    y = height - 170
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "1. Informations de l'Officiel")
    c.line(50, y - 5, width - 50, y - 5)

    y -= 30
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Nom de l'arbitre :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, referee.name)

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "N° de Licence :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, referee.license_number)

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Téléphone :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, referee.phone)

    # Section 2: Match Details
    y -= 45
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "2. Détails de la Rencontre")
    c.line(50, y - 5, width - 50, y - 5)

    home_name = match.home_team.name if match.home_team else "Equipe Réception"
    away_name = match.away_team.name if match.away_team else "Equipe Visiteuse"

    y -= 30
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Match :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, f"{home_name} vs {away_name}")

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Date & Heure :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, f"{match.date} à {match.time}")

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Lieu / Salle :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, f"{match.venue}, {match.city}")

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Division / Catégorie :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, f"{match.division} - {match.category}")

    # Section 3: Indemnity Payment
    y -= 45
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "3. Indemnité et Règlement")
    c.line(50, y - 5, width - 50, y - 5)

    y -= 30
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Fonction :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, assignment.referee_function)

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Club payeur :")
    c.setFont("Helvetica", 11)
    c.drawString(200, y, paying_team.name if paying_team else "Club Organisateur")

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Montant (chiffres) :")
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#C2410C"))
    c.drawString(200, y, f"{assignment.indemnity:.2f} MAD")
    c.setFillColor(colors.HexColor("#111827"))

    y -= 22
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, y, "Montant (en lettres) :")
    c.setFont("Helvetica-Oblique", 11)
    c.drawString(200, y, receipt.amount_in_words)

    # Signatures
    y -= 70
    c.setStrokeColor(colors.HexColor("#E5E1DA"))
    c.line(50, y, width - 50, y)

    y -= 30
    c.setFont("Helvetica-Bold", 11)
    c.drawString(80, y, "Signature de l'Arbitre")
    c.drawString(width - 230, y, "Pour la Commission / Club")

    y -= 50
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#5B6472"))
    c.drawString(80, y, "(Lu et approuvé)")
    c.drawString(width - 230, y, "(Cachet et signature)")

    # Footer
    c.setFont("Helvetica", 8)
    c.drawString(50, 40, "Document officiel généré électroniquement par Referee Manager.")
    c.drawRightString(width - 50, 40, f"Identifiant: {receipt.id}")

    c.save()
    return pdf_path
