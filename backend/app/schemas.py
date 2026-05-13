import re
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from app.models import (
    UserRole, EventStatus, EventCategory, BookingStatus,
    PaymentStatus, PaymentMethod, TicketType, NotificationType
)


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    phone: Optional[str] = None
    role: Optional[UserRole] = UserRole.CLIENT

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not re.match(r"^[a-zA-Z0-9_]{3,50}$", v):
            raise ValueError("Username must be 3-50 chars, letters/digits/underscores only")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8: raise ValueError("At least 8 characters required")
        if not re.search(r"[A-Z]", v): raise ValueError("Must contain an uppercase letter")
        if not re.search(r"[0-9]", v): raise ValueError("Must contain a digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v): raise ValueError("Must contain a special character")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2: raise ValueError("Full name too short")
        return v.strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8: raise ValueError("At least 8 characters required")
        if not re.search(r"[A-Z]", v): raise ValueError("Must contain an uppercase letter")
        if not re.search(r"[0-9]", v): raise ValueError("Must contain a digit")
        return v


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ─── User ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int; email: str; username: str; full_name: str
    phone: Optional[str] = None; avatar: Optional[str] = None
    role: UserRole; is_active: bool; is_verified: bool
    bio: Optional[str] = None; created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    full_name: Optional[str] = None; phone: Optional[str] = None
    bio: Optional[str] = None; avatar: Optional[str] = None

class UserAdminUpdate(UserUpdate):
    role: Optional[UserRole] = None; is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

class Token(BaseModel):
    access_token: str; refresh_token: str; token_type: str = "bearer"
    expires_in: int; user: UserOut


# ─── Ticket Tier ──────────────────────────────────────────────────────────────

class TicketTierIn(BaseModel):
    name: TicketType = TicketType.GENERAL
    price: float; quantity: int
    description: Optional[str] = None; benefits: Optional[str] = None
    sale_start: Optional[datetime] = None; sale_end: Optional[datetime] = None
    max_per_booking: int = 10

    @field_validator("price")
    @classmethod
    def price_ok(cls, v):
        if v < 0: raise ValueError("Price cannot be negative")
        return round(v, 2)

    @field_validator("quantity")
    @classmethod
    def qty_ok(cls, v):
        if v < 1: raise ValueError("Quantity must be ≥ 1")
        return v

class TicketTierOut(TicketTierIn):
    id: int; event_id: int; available: int; is_active: bool
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── Event ────────────────────────────────────────────────────────────────────

class EventIn(BaseModel):
    title: str; description: str; category: EventCategory
    start_datetime: datetime; end_datetime: datetime
    venue_name: str; venue_address: str; city: str; country: str = "Rwanda"
    total_capacity: int; is_free: bool = False; tags: Optional[str] = None
    featured: bool = False; latitude: Optional[float] = None; longitude: Optional[float] = None
    ticket_types: List[TicketTierIn] = []

    @field_validator("title")
    @classmethod
    def title_ok(cls, v):
        if len(v.strip()) < 3: raise ValueError("Title must be ≥ 3 characters")
        return v.strip()

    @field_validator("total_capacity")
    @classmethod
    def capacity_ok(cls, v):
        if v < 1: raise ValueError("Capacity must be ≥ 1")
        return v

    @model_validator(mode="after")
    def dates_ok(self):
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        return self

class EventUpdate(BaseModel):
    title: Optional[str] = None; description: Optional[str] = None
    category: Optional[EventCategory] = None; status: Optional[EventStatus] = None
    start_datetime: Optional[datetime] = None; end_datetime: Optional[datetime] = None
    venue_name: Optional[str] = None; venue_address: Optional[str] = None
    city: Optional[str] = None; country: Optional[str] = None
    total_capacity: Optional[int] = None; is_free: Optional[bool] = None
    tags: Optional[str] = None; featured: Optional[bool] = None
    latitude: Optional[float] = None; longitude: Optional[float] = None

class EventOut(BaseModel):
    id: int; title: str; description: str; category: EventCategory
    status: EventStatus; start_datetime: datetime; end_datetime: datetime
    venue_name: str; venue_address: str; city: str; country: str
    total_capacity: int; available_seats: int; is_free: bool
    cover_image: Optional[str] = None; banner_image: Optional[str] = None
    tags: Optional[str] = None; featured: bool
    latitude: Optional[float] = None; longitude: Optional[float] = None
    created_by: int; created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    ticket_types: List[TicketTierOut] = []
    creator: Optional[UserOut] = None
    total_bookings: Optional[int] = 0
    average_rating: Optional[float] = None
    model_config = {"from_attributes": True}

class EventList(BaseModel):
    events: List[EventOut]; total: int; page: int; per_page: int; total_pages: int


# ─── Booking ──────────────────────────────────────────────────────────────────

class BookingIn(BaseModel):
    event_id: int; ticket_type_id: int; quantity: int = 1
    special_requests: Optional[str] = None
    attendee_name: Optional[str] = None; attendee_email: Optional[str] = None
    attendee_phone: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def qty_ok(cls, v):
        if v < 1: raise ValueError("Quantity ≥ 1")
        if v > 20: raise ValueError("Max 20 tickets per booking")
        return v

class BookingCancelIn(BaseModel):
    reason: Optional[str] = None

class CheckInIn(BaseModel):
    booking_reference: str

class BookingOut(BaseModel):
    id: int; booking_reference: str; user_id: int; event_id: int; ticket_type_id: int
    quantity: int; unit_price: float; total_amount: float; discount_amount: float
    final_amount: float; status: BookingStatus; payment_status: PaymentStatus
    qr_code: Optional[str] = None; special_requests: Optional[str] = None
    cancellation_reason: Optional[str] = None; cancelled_at: Optional[datetime] = None
    attendee_name: Optional[str] = None; attendee_email: Optional[str] = None
    attendee_phone: Optional[str] = None; checked_in: bool
    checked_in_at: Optional[datetime] = None; created_at: Optional[datetime] = None
    event: Optional[EventOut] = None; ticket_tier: Optional[TicketTierOut] = None
    payment: Optional["PaymentOut"] = None
    model_config = {"from_attributes": True}

class BookingList(BaseModel):
    bookings: List[BookingOut]; total: int; page: int; per_page: int; total_pages: int


# ─── Payment ──────────────────────────────────────────────────────────────────

class PaymentIn(BaseModel):
    booking_id: int; method: PaymentMethod = PaymentMethod.SIMULATED

class RefundIn(BaseModel):
    reason: str; amount: Optional[float] = None

class PaymentOut(BaseModel):
    id: int; booking_id: int; transaction_id: str; amount: float; currency: str
    method: PaymentMethod; status: PaymentStatus; simulated: bool
    receipt_number: Optional[str] = None; paid_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None; refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None; created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── Review ───────────────────────────────────────────────────────────────────

class ReviewIn(BaseModel):
    event_id: int; rating: int; comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def rating_ok(cls, v):
        if not 1 <= v <= 5: raise ValueError("Rating must be 1–5")
        return v

class ReviewOut(BaseModel):
    id: int; user_id: int; event_id: int; rating: int
    comment: Optional[str] = None; is_visible: bool; created_at: Optional[datetime] = None
    user: Optional[UserOut] = None
    model_config = {"from_attributes": True}


# ─── Notification ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int; user_id: int; type: NotificationType; title: str; message: str
    is_read: bool; data: Optional[str] = None; created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ─── Analytics ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_events: int; total_bookings: int; total_revenue: float
    total_users: int; upcoming_events: int; active_events: int
    cancelled_bookings: int; total_attendees: int

class RevenueMonth(BaseModel):
    month: str; revenue: float; bookings: int

class EventAnalytics(BaseModel):
    event_id: int; event_title: str; total_bookings: int
    total_revenue: float; attendance_rate: float; average_rating: Optional[float] = None


# ─── Generic ──────────────────────────────────────────────────────────────────

class Msg(BaseModel):
    message: str; success: bool = True


# Rebuild forward refs
BookingOut.model_rebuild()
