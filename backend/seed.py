from app.core import SessionLocal, create_tables, hash_password
from app.models import (
    User, Event, TicketTier, Booking, Payment, Notification,
    UserRole, EventStatus, EventCategory, BookingStatus,
    PaymentStatus, PaymentMethod, TicketType, NotificationType
)
from app.utils import gen_booking_ref, gen_transaction_id, gen_receipt_number, booking_qr, push_notification
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def seed():
    create_tables()
    db = SessionLocal()
    try:
        if db.query(User).first():
            log.info("Already seeded — skipping."); return

        # ── Users ──────────────────────────────────────────────────────────
        admin   = User(email="admin@smartevents.com",   username="admin",        full_name="System Admin",    hashed_password=hash_password("Admin@1234"),   role=UserRole.ADMIN,          is_active=True, is_verified=True,  phone="+250788000001")
        manager = User(email="manager@smartevents.com", username="eventmanager", full_name="Event Manager",   hashed_password=hash_password("Manager@1234"), role=UserRole.EVENT_MANAGER,  is_active=True, is_verified=True,  phone="+250788000002")
        client1 = User(email="john@example.com",        username="johndoe",      full_name="John Doe",        hashed_password=hash_password("Client@1234"),  role=UserRole.CLIENT,         is_active=True, is_verified=True,  phone="+250788000003")
        client2 = User(email="jane@example.com",        username="janedoe",      full_name="Jane Doe",        hashed_password=hash_password("Client@1234"),  role=UserRole.CLIENT,         is_active=True, is_verified=True,  phone="+250788000004")
        db.add_all([admin, manager, client1, client2]); db.flush()

        # ── Events ─────────────────────────────────────────────────────────
        now = datetime.utcnow()
        e1 = Event(title="Kigali Tech Summit 2026", description="East Africa's largest tech conference. 500+ developers, entrepreneurs & tech leaders.", category=EventCategory.CONFERENCE, status=EventStatus.PUBLISHED, start_datetime=now+timedelta(days=30), end_datetime=now+timedelta(days=32), venue_name="Kigali Convention Centre", venue_address="KG 2 Roundabout, Kimihurura", city="Kigali", country="Rwanda", total_capacity=500, available_seats=472, is_free=False, featured=True, tags="tech,conference,networking", created_by=manager.id, latitude=-1.9500, longitude=30.0588)
        e2 = Event(title="Rwanda Music Festival 2026", description="Spectacular evening of Rwandan and African music under the stars.", category=EventCategory.CONCERT, status=EventStatus.PUBLISHED, start_datetime=now+timedelta(days=15), end_datetime=now+timedelta(days=15, hours=6), venue_name="Amahoro National Stadium", venue_address="KG 11 Ave, Remera", city="Kigali", country="Rwanda", total_capacity=5000, available_seats=4800, is_free=False, featured=True, tags="music,festival,culture", created_by=manager.id)
        e3 = Event(title="Digital Marketing Bootcamp", description="3-day intensive bootcamp: SEO, social media, content strategy, paid ads. Certificate provided.", category=EventCategory.TRAINING, status=EventStatus.PUBLISHED, start_datetime=now+timedelta(days=7), end_datetime=now+timedelta(days=10), venue_name="Norrsken Kigali House", venue_address="1 KN 78 St, Kacyiru", city="Kigali", country="Rwanda", total_capacity=50, available_seats=30, is_free=False, tags="marketing,digital,training", created_by=manager.id)
        e4 = Event(title="Community Python Workshop", description="Free intro Python programming workshop for beginners. No experience needed.", category=EventCategory.WORKSHOP, status=EventStatus.PUBLISHED, start_datetime=now+timedelta(days=5), end_datetime=now+timedelta(days=5, hours=4), venue_name="Kigali Public Library", venue_address="KN 4 Ave, Nyarugenge", city="Kigali", country="Rwanda", total_capacity=30, available_seats=25, is_free=True, tags="coding,python,free,beginners", created_by=admin.id)
        db.add_all([e1, e2, e3, e4]); db.flush()

        # ── Ticket Tiers ───────────────────────────────────────────────────
        tiers = [
            TicketTier(event_id=e1.id, name=TicketType.GENERAL,    price=50000,  quantity=400, available=375, description="General admission"),
            TicketTier(event_id=e1.id, name=TicketType.VIP,         price=150000, quantity=100, available=97,  description="VIP — front row, dinner & gift bag", benefits="Dinner,Front row,Networking,Gift bag"),
            TicketTier(event_id=e2.id, name=TicketType.GENERAL,    price=20000,  quantity=4000,available=3850,description="General standing area"),
            TicketTier(event_id=e2.id, name=TicketType.VIP,         price=80000,  quantity=500, available=490, description="VIP seated + bar access"),
            TicketTier(event_id=e2.id, name=TicketType.EARLY_BIRD,  price=15000,  quantity=500, available=460, description="Early bird — limited!"),
            TicketTier(event_id=e3.id, name=TicketType.GENERAL,    price=75000,  quantity=50,  available=30,  description="Full bootcamp"),
            TicketTier(event_id=e3.id, name=TicketType.STUDENT,     price=40000,  quantity=20,  available=15,  description="Student discount — valid ID required"),
            TicketTier(event_id=e4.id, name=TicketType.GENERAL,    price=0,      quantity=30,  available=25,  description="Free entry"),
        ]
        db.add_all(tiers); db.flush()

        # ── Sample Bookings ────────────────────────────────────────────────
        ref1 = gen_booking_ref()
        b1 = Booking(booking_reference=ref1, user_id=client1.id, event_id=e1.id, ticket_type_id=tiers[0].id,
                     quantity=2, unit_price=50000, total_amount=100000, discount_amount=0, final_amount=100000,
                     status=BookingStatus.CONFIRMED, payment_status=PaymentStatus.PAID,
                     attendee_name=client1.full_name, attendee_email=client1.email)
        b1.qr_code = booking_qr(ref1, e1.title, client1.email)
        db.add(b1); db.flush()
        db.add(Payment(booking_id=b1.id, transaction_id=gen_transaction_id(), amount=100000, currency="RWF",
                       method=PaymentMethod.MOBILE_MONEY, status=PaymentStatus.PAID, simulated=True,
                       receipt_number=gen_receipt_number(), paid_at=now-timedelta(days=2)))

        ref2 = gen_booking_ref()
        b2 = Booking(booking_reference=ref2, user_id=client2.id, event_id=e2.id, ticket_type_id=tiers[3].id,
                     quantity=1, unit_price=80000, total_amount=80000, discount_amount=0, final_amount=80000,
                     status=BookingStatus.CONFIRMED, payment_status=PaymentStatus.PAID,
                     attendee_name=client2.full_name, attendee_email=client2.email)
        b2.qr_code = booking_qr(ref2, e2.title, client2.email)
        db.add(b2); db.flush()
        db.add(Payment(booking_id=b2.id, transaction_id=gen_transaction_id(), amount=80000, currency="RWF",
                       method=PaymentMethod.CARD, status=PaymentStatus.PAID, simulated=True,
                       receipt_number=gen_receipt_number(), paid_at=now-timedelta(days=1)))

        # ── Notifications ──────────────────────────────────────────────────
        push_notification(db, admin.id,   NotificationType.GENERAL,            "Welcome Admin! 🚀",          "Your admin account is ready.")
        push_notification(db, client1.id, NotificationType.BOOKING_CONFIRMED,  "Booking Confirmed! 🎟️",      f"Your booking for Kigali Tech Summit is confirmed. Ref: {ref1}")
        push_notification(db, client2.id, NotificationType.BOOKING_CONFIRMED,  "Booking Confirmed! 🎶",      f"Your VIP booking for Rwanda Music Festival is confirmed. Ref: {ref2}")

        db.commit()
        log.info("✅ Seeded successfully!")
        log.info("─" * 50)
        log.info("  admin@smartevents.com   →  Admin@1234")
        log.info("  manager@smartevents.com →  Manager@1234")
        log.info("  john@example.com        →  Client@1234")
        log.info("  jane@example.com        →  Client@1234")
        log.info("─" * 50)
    except Exception as e:
        db.rollback(); log.error(f"Seed failed: {e}"); raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
