# ═══════════════════════════════════════════════════════════════════
#  models.py  —  all SQLAlchemy models + enums
# ═══════════════════════════════════════════════════════════════════
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime,
    ForeignKey, Text, Enum, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EVENT_MANAGER = "event_manager"
    CLIENT = "client"

class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class EventCategory(str, enum.Enum):
    CONFERENCE = "conference"
    CONCERT = "concert"
    WEDDING = "wedding"
    SPORTS = "sports"
    TRAINING = "training"
    WORKSHOP = "workshop"
    SEMINAR = "seminar"
    NETWORKING = "networking"
    EXHIBITION = "exhibition"
    OTHER = "other"

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    ATTENDED = "attended"
    NO_SHOW = "no_show"

class PaymentStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    MOBILE_MONEY = "mobile_money"
    BANK_TRANSFER = "bank_transfer"
    SIMULATED = "simulated"

class TicketType(str, enum.Enum):
    GENERAL = "general"
    VIP = "vip"
    EARLY_BIRD = "early_bird"
    STUDENT = "student"
    GROUP = "group"

class NotificationType(str, enum.Enum):
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    EVENT_REMINDER = "event_reminder"
    EVENT_CANCELLED = "event_cancelled"
    PAYMENT_RECEIVED = "payment_received"
    GENERAL = "general"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    username        = Column(String(100), unique=True, index=True, nullable=False)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone           = Column(String(20))
    avatar          = Column(String(500))
    role            = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    is_verified     = Column(Boolean, default=False, nullable=False)
    bio             = Column(Text)
    last_login      = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    events_created  = relationship("Event", back_populates="creator", foreign_keys="Event.created_by")
    bookings        = relationship("Booking", back_populates="user")
    notifications   = relationship("Notification", back_populates="user")
    reviews         = relationship("Review", back_populates="user")


# ─── Event ────────────────────────────────────────────────────────────────────

class Event(Base):
    __tablename__ = "events"
    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String(300), nullable=False, index=True)
    description     = Column(Text, nullable=False)
    category        = Column(Enum(EventCategory), nullable=False)
    status          = Column(Enum(EventStatus), default=EventStatus.DRAFT, nullable=False)
    start_datetime  = Column(DateTime(timezone=True), nullable=False)
    end_datetime    = Column(DateTime(timezone=True), nullable=False)
    venue_name      = Column(String(300), nullable=False)
    venue_address   = Column(String(500), nullable=False)
    city            = Column(String(100), nullable=False)
    country         = Column(String(100), default="Rwanda", nullable=False)
    latitude        = Column(Float)
    longitude       = Column(Float)
    total_capacity  = Column(Integer, nullable=False)
    available_seats = Column(Integer, nullable=False)
    is_free         = Column(Boolean, default=False, nullable=False)
    cover_image     = Column(String(500))
    banner_image    = Column(String(500))
    tags            = Column(String(500))      # comma-separated
    featured        = Column(Boolean, default=False, nullable=False)
    created_by      = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    creator         = relationship("User", back_populates="events_created", foreign_keys=[created_by])
    ticket_types    = relationship("TicketTier", back_populates="event", cascade="all, delete-orphan")
    bookings        = relationship("Booking", back_populates="event")
    reviews         = relationship("Review", back_populates="event")


# ─── Ticket Tier ──────────────────────────────────────────────────────────────

class TicketTier(Base):
    __tablename__ = "ticket_tiers"
    id              = Column(Integer, primary_key=True, index=True)
    event_id        = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name            = Column(Enum(TicketType), default=TicketType.GENERAL, nullable=False)
    price           = Column(Float, nullable=False, default=0.0)
    quantity        = Column(Integer, nullable=False)
    available       = Column(Integer, nullable=False)
    description     = Column(String(300))
    benefits        = Column(Text)
    sale_start      = Column(DateTime(timezone=True))
    sale_end        = Column(DateTime(timezone=True))
    max_per_booking = Column(Integer, default=10, nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    event           = relationship("Event", back_populates="ticket_types")
    bookings        = relationship("Booking", back_populates="ticket_tier")
    __table_args__  = (UniqueConstraint("event_id", "name", name="uq_event_ticket"),)


# ─── Booking ──────────────────────────────────────────────────────────────────

class Booking(Base):
    __tablename__ = "bookings"
    id                  = Column(Integer, primary_key=True, index=True)
    booking_reference   = Column(String(20), unique=True, nullable=False, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id            = Column(Integer, ForeignKey("events.id"), nullable=False)
    ticket_type_id      = Column(Integer, ForeignKey("ticket_tiers.id"), nullable=False)
    quantity            = Column(Integer, default=1, nullable=False)
    unit_price          = Column(Float, nullable=False)
    total_amount        = Column(Float, nullable=False)
    discount_amount     = Column(Float, default=0.0, nullable=False)
    final_amount        = Column(Float, nullable=False)
    status              = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)
    payment_status      = Column(Enum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False)
    qr_code             = Column(String(500))
    special_requests    = Column(Text)
    cancellation_reason = Column(Text)
    cancelled_at        = Column(DateTime(timezone=True))
    attendee_name       = Column(String(255))
    attendee_email      = Column(String(255))
    attendee_phone      = Column(String(20))
    checked_in          = Column(Boolean, default=False, nullable=False)
    checked_in_at       = Column(DateTime(timezone=True))
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    user        = relationship("User", back_populates="bookings")
    event       = relationship("Event", back_populates="bookings")
    ticket_tier = relationship("TicketTier", back_populates="bookings")
    payment     = relationship("Payment", back_populates="booking", uselist=False)


# ─── Payment ──────────────────────────────────────────────────────────────────

class Payment(Base):
    __tablename__ = "payments"
    id               = Column(Integer, primary_key=True, index=True)
    booking_id       = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True)
    transaction_id   = Column(String(100), unique=True, nullable=False, index=True)
    amount           = Column(Float, nullable=False)
    currency         = Column(String(10), default="RWF", nullable=False)
    method           = Column(Enum(PaymentMethod), default=PaymentMethod.SIMULATED, nullable=False)
    status           = Column(Enum(PaymentStatus), default=PaymentStatus.UNPAID, nullable=False)
    simulated        = Column(Boolean, default=True, nullable=False)
    gateway_response = Column(Text)
    receipt_number   = Column(String(50))
    paid_at          = Column(DateTime(timezone=True))
    refunded_at      = Column(DateTime(timezone=True))
    refund_amount    = Column(Float)
    refund_reason    = Column(Text)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    booking = relationship("Booking", back_populates="payment")


# ─── Review ───────────────────────────────────────────────────────────────────

class Review(Base):
    __tablename__ = "reviews"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id   = Column(Integer, ForeignKey("events.id"), nullable=False)
    rating     = Column(Integer, nullable=False)   # 1-5
    comment    = Column(Text)
    is_visible = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user  = relationship("User", back_populates="reviews")
    event = relationship("Event", back_populates="reviews")
    __table_args__ = (UniqueConstraint("user_id", "event_id", name="uq_user_review"),)


# ─── Notification ─────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    type       = Column(Enum(NotificationType), nullable=False)
    title      = Column(String(300), nullable=False)
    message    = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False, nullable=False)
    data       = Column(Text)   # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
    __table_args__ = (Index("ix_notif_user", "user_id"),)


# ─── Waitlist ─────────────────────────────────────────────────────────────────

class Waitlist(Base):
    __tablename__ = "waitlist"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id       = Column(Integer, ForeignKey("events.id"), nullable=False)
    ticket_type_id = Column(Integer, ForeignKey("ticket_tiers.id"), nullable=False)
    quantity       = Column(Integer, default=1, nullable=False)
    notified       = Column(Boolean, default=False, nullable=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    __table_args__  = (UniqueConstraint("user_id", "event_id", name="uq_waitlist"),)
