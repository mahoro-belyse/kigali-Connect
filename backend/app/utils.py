import os, uuid, random, string, qrcode, json, base64, logging
from io import BytesIO
from datetime import datetime,timezone
from pathlib import Path
from app.core import settings

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


# ─── Reference / ID generators ───────────────────────────────────────────────

def gen_booking_ref() -> str:
    chars = string.ascii_uppercase + string.digits
    return f"EVT-{datetime.now(timezone.utc).year}-{''.join(random.choices(chars, k=8))}"

def gen_transaction_id() -> str:
    return f"TXN-{uuid.uuid4().hex[:12].upper()}"

def gen_receipt_number() -> str:
    return f"RCP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


# ─── QR Code ─────────────────────────────────────────────────────────────────

def generate_qr(data: str) -> str:
    """Return base64-encoded PNG data URI."""
    try:
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        logger.error(f"QR generation failed: {e}")
        return ""

def booking_qr(ref: str, event_title: str, email: str) -> str:
    return generate_qr(json.dumps({"ref": ref, "event": event_title, "user": email, "verified": True}))


# ─── File Upload ─────────────────────────────────────────────────────────────

def validate_image(content_type: str, size: int) -> bool:
    return content_type in ALLOWED_IMAGE_TYPES and size <= MAX_FILE_SIZE

def save_file(content: bytes, filename: str, folder: str = "events") -> str:
    path = Path(settings.UPLOAD_DIR) / folder
    path.mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix.lower()
    name = f"{uuid.uuid4().hex}{ext}"
    (path / name).write_bytes(content)
    return f"/{settings.UPLOAD_DIR}/{folder}/{name}"

def delete_file(path: str):
    try:
        p = Path(path.lstrip("/"))
        if p.exists(): p.unlink()
    except Exception as e:
        logger.error(f"Delete failed: {e}")


# ─── Pagination ───────────────────────────────────────────────────────────────

def paginate(query, page: int, per_page: int):
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return items, total

def total_pages(total: int, per_page: int) -> int:
    return max(1, (total + per_page - 1) // per_page)


# ─── In-app notification creator ─────────────────────────────────────────────

def push_notification(db, user_id: int, ntype, title: str, message: str, data: dict = None):
    from app.models import Notification
    n = Notification(user_id=user_id, type=ntype.value, title=title, message=message,
                 data=json.dumps(data) if data else None)
    db.add(n)
    return n


# ─── Email stubs (replace with SMTP/SendGrid in production) ──────────────────

def email_booking_confirmed(to: str, name: str, ref: str, event: str, date: str, venue: str, qty: int, amount: float):
    logger.info(f"[EMAIL] Booking confirmed → {to} | ref={ref} | event={event} | amount={amount:,.0f} RWF")

def email_booking_cancelled(to: str, name: str, ref: str, event: str, reason: str = None):
    logger.info(f"[EMAIL] Booking cancelled → {to} | ref={ref} | reason={reason}")
