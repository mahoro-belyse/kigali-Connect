# ═══════════════════════════════════════════════════════════════════
#  routes.py  —  ALL endpoints: auth · users · events · bookings ·
#                payments · analytics · reviews · notifications
# ═══════════════════════════════════════════════════════════════════
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract, or_, and_
from datetime import datetime, timedelta
from typing import Optional, List

from app.core import (
    get_db, get_current_user, get_optional_user,
    require_admin, require_manager,
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    check_lockout, record_failure, reset_attempts, settings
)
from app.models import (
    User, Event, TicketTier, Booking, Payment, Review,
    Notification, Waitlist,
    UserRole, EventStatus, EventCategory, BookingStatus,
    PaymentStatus, PaymentMethod, TicketType, NotificationType
)
from app.schemas import (
    UserRegister, UserLogin, UserOut, UserUpdate, UserAdminUpdate, Token, PasswordChange, RefreshTokenRequest,
    EventIn, EventUpdate, EventOut, EventList, TicketTierIn, TicketTierOut,
    BookingIn, BookingOut, BookingList, BookingCancelIn, CheckInIn,
    PaymentIn, PaymentOut, RefundIn,
    ReviewIn, ReviewOut,
    NotificationOut,
    DashboardStats, RevenueMonth, EventAnalytics,
    Msg
)
from app.utils import (
    gen_booking_ref, gen_transaction_id, gen_receipt_number,
    booking_qr, validate_image, save_file, delete_file,
    paginate, total_pages, push_notification,
    email_booking_confirmed, email_booking_cancelled
)

router = APIRouter(prefix="/api/v1")


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════════════════════════

auth = APIRouter(prefix="/auth", tags=["Authentication"])

@auth.post("/register", response_model=UserOut, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(409, "Email already registered")
    if db.query(User).filter(User.username == data.username.lower()).first():
        raise HTTPException(409, "Username already taken")

    role = UserRole.CLIENT if data.role == UserRole.ADMIN else (data.role or UserRole.CLIENT)
    user = User(email=data.email.lower(), username=data.username.lower(),
                full_name=data.full_name, hashed_password=hash_password(data.password),
                phone=data.phone, role=role, is_active=True, is_verified=False)
    db.add(user)
    db.flush()
    push_notification(db, user.id, NotificationType.GENERAL,
                      "Welcome to SmartEvent! 🎉",
                      f"Hi {user.full_name}, your account is ready. Start exploring events!")
    db.commit()
    db.refresh(user)
    return user


@auth.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    email = data.email.lower()
    locked, secs = check_lockout(email)
    if locked:
        raise HTTPException(429, f"Account locked. Try again in {secs} second(s).",
                            headers={"Retry-After": str(secs)})

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        info = record_failure(email)
        raise HTTPException(429 if info["locked"] else 401, info["message"],
                            headers={"Retry-After": str(settings.LOCKOUT_DURATION_MINUTES * 60)} if info["locked"] else {})

    if not user.is_active:
        raise HTTPException(403, "Account disabled. Contact support.")

    reset_attempts(email)
    user.last_login = datetime.utcnow()
    db.commit(); db.refresh(user)

    td = {"sub": str(user.id), "role": user.role, "email": user.email}
    return Token(access_token=create_access_token(td), refresh_token=create_refresh_token(td),
                 expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                 user=UserOut.model_validate(user))


@auth.post("/refresh", response_model=Token)
def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid or expired refresh token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")
    td = {"sub": str(user.id), "role": user.role, "email": user.email}
    return Token(access_token=create_access_token(td), refresh_token=create_refresh_token(td),
                 expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                 user=UserOut.model_validate(user))


@auth.post("/logout", response_model=Msg)
def logout(user=Depends(get_current_user)):
    return Msg(message="Logged out successfully")


@auth.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user


@auth.post("/change-password", response_model=Msg)
def change_password(data: PasswordChange, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(400, "New password must differ from current")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return Msg(message="Password changed successfully")


# ══════════════════════════════════════════════════════════════════════════════
#  USERS
# ══════════════════════════════════════════════════════════════════════════════

users = APIRouter(prefix="/users", tags=["Users"])

@users.get("/", response_model=dict, dependencies=[Depends(require_admin)])
def list_users(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=100),
               role: UserRole = None, search: str = None, is_active: bool = None,
               db: Session = Depends(get_db)):
    q = db.query(User)
    if role: q = q.filter(User.role == role)
    if is_active is not None: q = q.filter(User.is_active == is_active)
    if search:
        t = f"%{search}%"
        q = q.filter(or_(User.full_name.ilike(t), User.email.ilike(t), User.username.ilike(t)))
    q = q.order_by(User.created_at.desc())
    items, total = paginate(q, page, per_page)
    return {"users": [UserOut.model_validate(u) for u in items], "total": total,
            "page": page, "per_page": per_page, "total_pages": total_pages(total, per_page)}


@users.get("/profile", response_model=UserOut)
def profile(user=Depends(get_current_user)): return user


@users.put("/profile", response_model=UserOut)
def update_profile(data: UserUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit(); db.refresh(user); return user


@users.post("/profile/avatar", response_model=UserOut)
async def upload_avatar(file: UploadFile = File(...), user=Depends(get_current_user), db: Session = Depends(get_db)):
    content = await file.read()
    if not validate_image(file.content_type, len(content)):
        raise HTTPException(400, "Invalid image. Allowed: JPEG/PNG/WebP, max 5MB")
    user.avatar = save_file(content, file.filename, "avatars")
    db.commit(); db.refresh(user); return user


@users.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u or (current.role == UserRole.CLIENT and not u.is_active):
        raise HTTPException(404, "User not found")
    return u


@users.put("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin)])
def admin_update_user(user_id: int, data: UserAdminUpdate, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u: raise HTTPException(404, "User not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    db.commit(); db.refresh(u); return u


@users.delete("/{user_id}", response_model=Msg)
def deactivate_user(user_id: int, current=Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == current.id: raise HTTPException(400, "Cannot deactivate your own account")
    u = db.query(User).filter(User.id == user_id).first()
    if not u: raise HTTPException(404, "User not found")
    u.is_active = False; db.commit()
    return Msg(message=f"User {u.email} deactivated")


# ══════════════════════════════════════════════════════════════════════════════
#  EVENTS
# ══════════════════════════════════════════════════════════════════════════════

events = APIRouter(prefix="/events", tags=["Events"])

def _enrich(event: Event, db: Session) -> EventOut:
    total_b = db.query(func.count(Booking.id)).filter(
        Booking.event_id == event.id, Booking.status != BookingStatus.CANCELLED).scalar() or 0
    avg_r = db.query(func.avg(Review.rating)).filter(
        Review.event_id == event.id, Review.is_visible == True).scalar()
    out = EventOut.model_validate(event)
    out.total_bookings = total_b
    out.average_rating = round(float(avg_r), 2) if avg_r else None
    return out


@events.get("/", response_model=EventList)
def list_events(page: int = Query(1, ge=1), per_page: int = Query(12, ge=1, le=100),
                search: str = None, category: EventCategory = None, status: EventStatus = None,
                city: str = None, is_free: bool = None, featured: bool = None,
                date_from: datetime = None, date_to: datetime = None,
                sort_by: str = Query("created_at"), order: str = Query("desc"),
                db: Session = Depends(get_db), current=Depends(get_optional_user)):
    q = db.query(Event).options(joinedload(Event.ticket_types), joinedload(Event.creator))
    if not current or current.role == UserRole.CLIENT:
        q = q.filter(Event.status == EventStatus.PUBLISHED)
    elif status:
        q = q.filter(Event.status == status)
    if search:
        t = f"%{search}%"
        q = q.filter(or_(Event.title.ilike(t), Event.description.ilike(t),
                          Event.venue_name.ilike(t), Event.city.ilike(t), Event.tags.ilike(t)))
    if category: q = q.filter(Event.category == category)
    if city: q = q.filter(Event.city.ilike(f"%{city}%"))
    if is_free is not None: q = q.filter(Event.is_free == is_free)
    if featured is not None: q = q.filter(Event.featured == featured)
    if date_from: q = q.filter(Event.start_datetime >= date_from)
    if date_to: q = q.filter(Event.start_datetime <= date_to)
    col = getattr(Event, sort_by, Event.created_at)
    q = q.order_by(col.desc() if order == "desc" else col.asc())
    items, total = paginate(q, page, per_page)
    return EventList(events=[_enrich(e, db) for e in items], total=total,
                     page=page, per_page=per_page, total_pages=total_pages(total, per_page))


@events.get("/upcoming", response_model=EventList)
def upcoming(limit: int = Query(6, ge=1, le=20), db: Session = Depends(get_db)):
    q = db.query(Event).filter(Event.status == EventStatus.PUBLISHED,
                                Event.start_datetime > datetime.utcnow()).order_by(Event.start_datetime)
    items, total = paginate(q, 1, limit)
    return EventList(events=[_enrich(e, db) for e in items], total=total,
                     page=1, per_page=limit, total_pages=total_pages(total, limit))


@events.get("/featured", response_model=EventList)
def featured_events(db: Session = Depends(get_db)):
    q = db.query(Event).filter(Event.status == EventStatus.PUBLISHED, Event.featured == True)
    items, total = paginate(q, 1, 10)
    return EventList(events=[_enrich(e, db) for e in items], total=total,
                     page=1, per_page=10, total_pages=total_pages(total, 10))


@events.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db), current=Depends(get_optional_user)):
    e = db.query(Event).options(joinedload(Event.ticket_types), joinedload(Event.creator)).filter(Event.id == event_id).first()
    if not e: raise HTTPException(404, "Event not found")
    if e.status != EventStatus.PUBLISHED:
        if not current or (current.role == UserRole.CLIENT and current.id != e.created_by):
            raise HTTPException(404, "Event not found")
    return _enrich(e, db)


@events.post("/", response_model=EventOut, status_code=201)
def create_event(data: EventIn, current=Depends(require_manager), db: Session = Depends(get_db)):
    e = Event(**{k: v for k, v in data.model_dump(exclude={"ticket_types"}).items()},
              available_seats=data.total_capacity, status=EventStatus.DRAFT, created_by=current.id)
    db.add(e); db.flush()
    for tt in data.ticket_types:
        db.add(TicketTier(event_id=e.id, **tt.model_dump(), available=tt.quantity))
    db.commit(); db.refresh(e); return _enrich(e, db)


@events.put("/{event_id}", response_model=EventOut)
def update_event(event_id: int, data: EventUpdate, current=Depends(require_manager), db: Session = Depends(get_db)):
    e = db.query(Event).filter(Event.id == event_id).first()
    if not e: raise HTTPException(404, "Event not found")
    if current.role == UserRole.EVENT_MANAGER and e.created_by != current.id:
        raise HTTPException(403, "You can only edit your own events")
    upd = data.model_dump(exclude_unset=True)
    if "total_capacity" in upd:
        e.available_seats = max(0, e.available_seats + (upd["total_capacity"] - e.total_capacity))
    for k, v in upd.items(): setattr(e, k, v)
    db.commit(); db.refresh(e); return _enrich(e, db)


@events.post("/{event_id}/publish", response_model=EventOut)
def publish_event(event_id: int, current=Depends(require_manager), db: Session = Depends(get_db)):
    e = db.query(Event).filter(Event.id == event_id).first()
    if not e: raise HTTPException(404, "Event not found")
    if current.role == UserRole.EVENT_MANAGER and e.created_by != current.id:
        raise HTTPException(403, "Permission denied")
    if not e.ticket_types: raise HTTPException(400, "Add at least one ticket type before publishing")
    e.status = EventStatus.PUBLISHED; db.commit(); db.refresh(e); return _enrich(e, db)


@events.post("/{event_id}/cancel", response_model=EventOut)
def cancel_event(event_id: int, current=Depends(require_manager), db: Session = Depends(get_db)):
    e = db.query(Event).filter(Event.id == event_id).first()
    if not e: raise HTTPException(404, "Event not found")
    e.status = EventStatus.CANCELLED
    for b in db.query(Booking).filter(Booking.event_id == event_id, Booking.status == BookingStatus.CONFIRMED).all():
        b.status = BookingStatus.CANCELLED
        push_notification(db, b.user_id, NotificationType.EVENT_CANCELLED,
                          f"Event Cancelled: {e.title}",
                          f"'{e.title}' has been cancelled. A full refund will be processed.",
                          {"event_id": event_id, "booking_ref": b.booking_reference})
    db.commit(); db.refresh(e); return _enrich(e, db)


@events.post("/{event_id}/cover-image", response_model=EventOut)
async def upload_cover(event_id: int, file: UploadFile = File(...),
                       current=Depends(require_manager), db: Session = Depends(get_db)):
    e = db.query(Event).filter(Event.id == event_id).first()
    if not e: raise HTTPException(404, "Event not found")
    content = await file.read()
    if not validate_image(file.content_type, len(content)):
        raise HTTPException(400, "Invalid image format or size (max 5MB)")
    if e.cover_image: delete_file(e.cover_image)
    e.cover_image = save_file(content, file.filename, "events/covers")
    db.commit(); db.refresh(e); return _enrich(e, db)


@events.delete("/{event_id}", response_model=Msg)
def delete_event(event_id: int, current=Depends(require_manager), db: Session = Depends(get_db)):
    e = db.query(Event).filter(Event.id == event_id).first()
    if not e: raise HTTPException(404, "Event not found")
    if current.role == UserRole.EVENT_MANAGER and e.created_by != current.id:
        raise HTTPException(403, "Permission denied")
    confirmed = db.query(Booking).filter(Booking.event_id == event_id,
                                          Booking.status == BookingStatus.CONFIRMED).count()
    if confirmed: raise HTTPException(400, f"{confirmed} confirmed booking(s) exist. Cancel the event instead.")
    db.delete(e); db.commit()
    return Msg(message="Event deleted")


@events.post("/{event_id}/tickets", response_model=TicketTierOut, status_code=201)
def add_ticket_tier(event_id: int, data: TicketTierIn, current=Depends(require_manager), db: Session = Depends(get_db)):
    if not db.query(Event).filter(Event.id == event_id).first():
        raise HTTPException(404, "Event not found")
    t = TicketTier(event_id=event_id, **data.model_dump(), available=data.quantity)
    db.add(t); db.commit(); db.refresh(t); return t


@events.put("/{event_id}/tickets/{tid}", response_model=TicketTierOut)
def update_ticket_tier(event_id: int, tid: int, data: TicketTierIn,
                        current=Depends(require_manager), db: Session = Depends(get_db)):
    t = db.query(TicketTier).filter(TicketTier.id == tid, TicketTier.event_id == event_id).first()
    if not t: raise HTTPException(404, "Ticket tier not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(t, k, v)
    db.commit(); db.refresh(t); return t


# ══════════════════════════════════════════════════════════════════════════════
#  BOOKINGS
# ══════════════════════════════════════════════════════════════════════════════

bookings = APIRouter(prefix="/bookings", tags=["Bookings"])

def _load_booking(booking_id: int, db: Session) -> Booking:
    return db.query(Booking).options(
        joinedload(Booking.event).joinedload(Event.ticket_types),
        joinedload(Booking.ticket_tier), joinedload(Booking.payment)
    ).filter(Booking.id == booking_id).first()


@bookings.post("/", response_model=BookingOut, status_code=201)
def create_booking(data: BookingIn, current=Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.query(Event).filter(Event.id == data.event_id).first()
    if not e: raise HTTPException(404, "Event not found")
    if e.status != EventStatus.PUBLISHED: raise HTTPException(400, "Event not available for booking")
    if e.start_datetime <= datetime.utcnow(): raise HTTPException(400, "Cannot book past events")

    tt = db.query(TicketTier).filter(TicketTier.id == data.ticket_type_id,
                                      TicketTier.event_id == data.event_id,
                                      TicketTier.is_active == True).first()
    if not tt: raise HTTPException(404, "Ticket tier not found")

    now = datetime.utcnow()
    if tt.sale_start and now < tt.sale_start: raise HTTPException(400, "Ticket sales not started")
    if tt.sale_end and now > tt.sale_end: raise HTTPException(400, "Ticket sales ended")
    if tt.available < data.quantity: raise HTTPException(409, f"Only {tt.available} ticket(s) available")
    if data.quantity > tt.max_per_booking: raise HTTPException(400, f"Max {tt.max_per_booking} tickets per booking")

    existing = db.query(Booking).filter(Booking.user_id == current.id, Booking.event_id == data.event_id,
                                         Booking.status != BookingStatus.CANCELLED).first()
    if existing: raise HTTPException(409, f"You already have booking {existing.booking_reference} for this event")

    ref = gen_booking_ref()
    while db.query(Booking).filter(Booking.booking_reference == ref).first():
        ref = gen_booking_ref()

    unit = tt.price
    total = unit * data.quantity
    b = Booking(booking_reference=ref, user_id=current.id, event_id=data.event_id,
                ticket_type_id=data.ticket_type_id, quantity=data.quantity,
                unit_price=unit, total_amount=total, discount_amount=0.0, final_amount=total,
                status=BookingStatus.CONFIRMED if e.is_free else BookingStatus.PENDING,
                payment_status=PaymentStatus.PAID if e.is_free else PaymentStatus.UNPAID,
                special_requests=data.special_requests,
                attendee_name=data.attendee_name or current.full_name,
                attendee_email=data.attendee_email or current.email,
                attendee_phone=data.attendee_phone or current.phone)
    db.add(b); db.flush()
    b.qr_code = booking_qr(ref, e.title, current.email)
    tt.available -= data.quantity
    e.available_seats = max(0, e.available_seats - data.quantity)

    push_notification(db, current.id, NotificationType.BOOKING_CONFIRMED,
                      "Booking Confirmed! 🎟️",
                      f"Your booking for '{e.title}' is confirmed. Ref: {ref}",
                      {"booking_ref": ref, "event_id": e.id})
    db.commit()
    email_booking_confirmed(current.email, current.full_name, ref, e.title,
                            str(e.start_datetime), e.venue_name, data.quantity, total)
    return _load_booking(b.id, db)


@bookings.get("/", response_model=BookingList)
def list_bookings(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50),
                  status: BookingStatus = None, payment_status: PaymentStatus = None,
                  event_id: int = None, current=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Booking).options(joinedload(Booking.event), joinedload(Booking.ticket_tier), joinedload(Booking.payment))
    if current.role == UserRole.CLIENT:
        q = q.filter(Booking.user_id == current.id)
    elif current.role == UserRole.EVENT_MANAGER:
        ids = [r.id for r in db.query(Event.id).filter(Event.created_by == current.id).all()]
        q = q.filter(Booking.event_id.in_(ids))
    if status: q = q.filter(Booking.status == status)
    if payment_status: q = q.filter(Booking.payment_status == payment_status)
    if event_id: q = q.filter(Booking.event_id == event_id)
    q = q.order_by(Booking.created_at.desc())
    items, total = paginate(q, page, per_page)
    return BookingList(bookings=items, total=total, page=page, per_page=per_page,
                       total_pages=total_pages(total, per_page))


@bookings.get("/my", response_model=BookingList)
def my_bookings(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50),
                status: BookingStatus = None, current=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Booking).options(joinedload(Booking.event), joinedload(Booking.ticket_tier), joinedload(Booking.payment)
                                   ).filter(Booking.user_id == current.id)
    if status: q = q.filter(Booking.status == status)
    q = q.order_by(Booking.created_at.desc())
    items, total = paginate(q, page, per_page)
    return BookingList(bookings=items, total=total, page=page, per_page=per_page,
                       total_pages=total_pages(total, per_page))


@bookings.get("/ref/{ref}", response_model=BookingOut)
def get_by_ref(ref: str, current=Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Booking).options(joinedload(Booking.event), joinedload(Booking.ticket_tier),
                                   joinedload(Booking.payment)).filter(Booking.booking_reference == ref.upper()).first()
    if not b: raise HTTPException(404, "Booking not found")
    if current.role == UserRole.CLIENT and b.user_id != current.id: raise HTTPException(403, "Access denied")
    return b


@bookings.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    b = _load_booking(booking_id, db)
    if not b: raise HTTPException(404, "Booking not found")
    if current.role == UserRole.CLIENT and b.user_id != current.id: raise HTTPException(403, "Access denied")
    return b


@bookings.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, data: BookingCancelIn, current=Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b: raise HTTPException(404, "Booking not found")
    if current.role == UserRole.CLIENT and b.user_id != current.id: raise HTTPException(403, "Access denied")
    if b.status == BookingStatus.CANCELLED: raise HTTPException(400, "Already cancelled")
    if b.status == BookingStatus.ATTENDED: raise HTTPException(400, "Cannot cancel attended booking")

    tt = db.query(TicketTier).filter(TicketTier.id == b.ticket_type_id).first()
    if tt: tt.available += b.quantity
    e = db.query(Event).filter(Event.id == b.event_id).first()
    if e: e.available_seats += b.quantity

    b.status = BookingStatus.CANCELLED
    b.cancellation_reason = data.reason
    b.cancelled_at = datetime.utcnow()
    push_notification(db, b.user_id, NotificationType.BOOKING_CANCELLED,
                      "Booking Cancelled", f"Booking {b.booking_reference} has been cancelled.",
                      {"booking_ref": b.booking_reference})
    db.commit()
    email_booking_cancelled(current.email, current.full_name, b.booking_reference,
                            e.title if e else "Unknown", data.reason)
    return _load_booking(booking_id, db)


@bookings.post("/check-in", response_model=BookingOut)
def check_in(data: CheckInIn, current=Depends(require_manager), db: Session = Depends(get_db)):
    b = db.query(Booking).options(joinedload(Booking.event), joinedload(Booking.ticket_tier)
                                   ).filter(Booking.booking_reference == data.booking_reference.upper()).first()
    if not b: raise HTTPException(404, "Booking not found")
    if b.status == BookingStatus.CANCELLED: raise HTTPException(400, "Booking is cancelled")
    if b.checked_in: raise HTTPException(409, f"Already checked in at {b.checked_in_at}")
    e = db.query(Event).filter(Event.id == b.event_id).first()
    if b.payment_status == PaymentStatus.UNPAID and e and not e.is_free:
        raise HTTPException(400, "Payment required before check-in")
    b.checked_in = True; b.checked_in_at = datetime.utcnow(); b.status = BookingStatus.ATTENDED
    db.commit(); return _load_booking(b.id, db)


# ══════════════════════════════════════════════════════════════════════════════
#  PAYMENTS
# ══════════════════════════════════════════════════════════════════════════════

payments = APIRouter(prefix="/payments", tags=["Payments"])

@payments.post("/", response_model=PaymentOut, status_code=201)
def pay(data: PaymentIn, current=Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Booking).options(joinedload(Booking.event)).filter(Booking.id == data.booking_id).first()
    if not b: raise HTTPException(404, "Booking not found")
    if current.role == UserRole.CLIENT and b.user_id != current.id: raise HTTPException(403, "Access denied")
    if b.payment_status == PaymentStatus.PAID: raise HTTPException(409, "Already paid")
    if b.status == BookingStatus.CANCELLED: raise HTTPException(400, "Booking is cancelled")

    txn = gen_transaction_id()
    while db.query(Payment).filter(Payment.transaction_id == txn).first(): txn = gen_transaction_id()

    p = Payment(booking_id=data.booking_id, transaction_id=txn, amount=b.final_amount,
                currency="RWF", method=data.method, status=PaymentStatus.PAID,
                simulated=True, receipt_number=gen_receipt_number(),
                paid_at=datetime.utcnow(), gateway_response='{"status":"success","simulated":true}')
    db.add(p)
    b.payment_status = PaymentStatus.PAID; b.status = BookingStatus.CONFIRMED
    push_notification(db, b.user_id, NotificationType.PAYMENT_RECEIVED,
                      "Payment Successful 💰",
                      f"Payment of {b.final_amount:,.0f} RWF received. Ref: {b.booking_reference}",
                      {"booking_ref": b.booking_reference, "transaction_id": txn})
    db.commit(); db.refresh(p); return p


@payments.get("/", response_model=dict)
def list_payments(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50),
                  status: PaymentStatus = None, current=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Payment).options(joinedload(Payment.booking))
    if current.role == UserRole.CLIENT:
        ids = [r.id for r in db.query(Booking.id).filter(Booking.user_id == current.id).all()]
        q = q.filter(Payment.booking_id.in_(ids))
    if status: q = q.filter(Payment.status == status)
    q = q.order_by(Payment.created_at.desc())
    items, total = paginate(q, page, per_page)
    return {"payments": [PaymentOut.model_validate(p) for p in items], "total": total,
            "page": page, "per_page": per_page, "total_pages": total_pages(total, per_page)}


@payments.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Payment).options(joinedload(Payment.booking)).filter(Payment.id == payment_id).first()
    if not p: raise HTTPException(404, "Payment not found")
    if current.role == UserRole.CLIENT and p.booking.user_id != current.id: raise HTTPException(403, "Access denied")
    return p


@payments.get("/booking/{booking_id}", response_model=PaymentOut)
def payment_by_booking(booking_id: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    if not p: raise HTTPException(404, "No payment for this booking")
    if current.role == UserRole.CLIENT:
        b = db.query(Booking).filter(Booking.id == booking_id).first()
        if not b or b.user_id != current.id: raise HTTPException(403, "Access denied")
    return p


@payments.post("/{payment_id}/refund", response_model=PaymentOut)
def refund(payment_id: int, data: RefundIn, current=Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Payment).options(joinedload(Payment.booking)).filter(Payment.id == payment_id).first()
    if not p: raise HTTPException(404, "Payment not found")
    if p.status != PaymentStatus.PAID: raise HTTPException(400, "Only paid payments can be refunded")
    amt = data.amount or p.amount
    if amt > p.amount: raise HTTPException(400, "Refund exceeds payment amount")
    full = amt >= p.amount
    p.status = PaymentStatus.REFUNDED if full else PaymentStatus.PARTIALLY_REFUNDED
    p.refunded_at = datetime.utcnow(); p.refund_amount = amt; p.refund_reason = data.reason
    p.booking.payment_status = PaymentStatus.REFUNDED if full else PaymentStatus.PARTIALLY_REFUNDED
    push_notification(db, p.booking.user_id, NotificationType.PAYMENT_RECEIVED,
                      "Refund Processed 💸", f"Refund of {amt:,.0f} RWF processed for {p.booking.booking_reference}.",
                      {"booking_ref": p.booking.booking_reference, "refund_amount": amt})
    db.commit(); db.refresh(p); return p


# ══════════════════════════════════════════════════════════════════════════════
#  ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

analytics = APIRouter(prefix="/analytics", tags=["Analytics"])

def _manager_event_ids(current, db):
    if current.role == UserRole.EVENT_MANAGER:
        return [r.id for r in db.query(Event.id).filter(Event.created_by == current.id).all()]
    return None


@analytics.get("/dashboard", response_model=DashboardStats)
def dashboard(current=Depends(require_manager), db: Session = Depends(get_db)):
    ids = _manager_event_ids(current, db)
    bf = Booking.event_id.in_(ids) if ids else True
    ef = Event.created_by == current.id if ids else True
    now = datetime.utcnow()
    rev = db.query(func.sum(Payment.amount)).join(Booking).filter(
        Booking.event_id.in_(ids) if ids else True, Payment.status == PaymentStatus.PAID).scalar() or 0.0
    return DashboardStats(
        total_events=db.query(func.count(Event.id)).filter(ef).scalar() or 0,
        total_bookings=db.query(func.count(Booking.id)).filter(bf, Booking.status != BookingStatus.CANCELLED).scalar() or 0,
        total_revenue=round(float(rev), 2),
        total_users=db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0,
        upcoming_events=db.query(func.count(Event.id)).filter(ef, Event.status == EventStatus.PUBLISHED, Event.start_datetime > now).scalar() or 0,
        active_events=db.query(func.count(Event.id)).filter(ef, Event.status == EventStatus.PUBLISHED).scalar() or 0,
        cancelled_bookings=db.query(func.count(Booking.id)).filter(bf, Booking.status == BookingStatus.CANCELLED).scalar() or 0,
        total_attendees=db.query(func.count(Booking.id)).filter(bf, Booking.checked_in == True).scalar() or 0,
    )


@analytics.get("/revenue/monthly", response_model=List[RevenueMonth])
def monthly_revenue(year: int = None, current=Depends(require_manager), db: Session = Depends(get_db)):
    year = year or datetime.utcnow().year
    ids = _manager_event_ids(current, db)
    months, names = [], ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    for m in range(1, 13):
        q = db.query(func.coalesce(func.sum(Payment.amount), 0), func.count(Payment.id)).join(Booking).filter(
            extract("year", Payment.paid_at) == year, extract("month", Payment.paid_at) == m,
            Payment.status == PaymentStatus.PAID)
        if ids: q = q.filter(Booking.event_id.in_(ids))
        rev, cnt = q.first()
        months.append(RevenueMonth(month=names[m-1], revenue=round(float(rev), 2), bookings=cnt))
    return months


@analytics.get("/events/top", response_model=List[EventAnalytics])
def top_events(limit: int = Query(10, ge=1, le=50), current=Depends(require_manager), db: Session = Depends(get_db)):
    ids = _manager_event_ids(current, db)
    q = db.query(Event.id, Event.title, Event.total_capacity,
                  func.count(Booking.id).label("cnt"),
                  func.coalesce(func.sum(Booking.final_amount), 0).label("rev"),
                  func.avg(Review.rating).label("avg_r")
                  ).outerjoin(Booking, and_(Booking.event_id == Event.id, Booking.status != BookingStatus.CANCELLED)
                  ).outerjoin(Review, Review.event_id == Event.id).group_by(Event.id, Event.title, Event.total_capacity)
    if ids: q = q.filter(Event.id.in_(ids))
    return [EventAnalytics(event_id=r.id, event_title=r.title, total_bookings=r.cnt or 0,
                            total_revenue=round(float(r.rev), 2),
                            attendance_rate=round((r.cnt / r.total_capacity * 100) if r.total_capacity else 0, 2),
                            average_rating=round(float(r.avg_r), 2) if r.avg_r else None)
            for r in q.order_by(func.count(Booking.id).desc()).limit(limit).all()]


@analytics.get("/summary")
def summary(current=Depends(require_manager), db: Session = Depends(get_db)):
    ids = _manager_event_ids(current, db)
    cat_q = db.query(Event.category, func.count(Booking.id), func.coalesce(func.sum(Booking.final_amount), 0)
                     ).join(Booking).filter(Booking.status != BookingStatus.CANCELLED).group_by(Event.category)
    if ids: cat_q = cat_q.filter(Event.id.in_(ids))
    recent_q = db.query(Booking).options(joinedload(Booking.event), joinedload(Booking.ticket_tier), joinedload(Booking.payment)
                                          ).order_by(Booking.created_at.desc()).limit(5)
    if ids: recent_q = recent_q.filter(Booking.event_id.in_(ids))
    return {
        "stats": dashboard(current, db),
        "revenue_by_month": monthly_revenue(None, current, db),
        "top_events": top_events(5, current, db),
        "bookings_by_category": [{"category": r[0], "bookings": r[1], "revenue": round(float(r[2]), 2)} for r in cat_q.all()],
        "recent_bookings": [BookingOut.model_validate(b) for b in recent_q.all()],
    }


@analytics.get("/users/stats", dependencies=[Depends(require_manager)])
def user_stats(db: Session = Depends(get_db)):
    return {
        "total_users": db.query(func.count(User.id)).scalar() or 0,
        "active_users": db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0,
        "new_users_30d": db.query(func.count(User.id)).filter(User.created_at >= datetime.utcnow() - timedelta(days=30)).scalar() or 0,
        "by_role": [{"role": r.role, "count": r.count} for r in db.query(User.role, func.count(User.id).label("count")).group_by(User.role).all()],
    }


# ══════════════════════════════════════════════════════════════════════════════
#  REVIEWS
# ══════════════════════════════════════════════════════════════════════════════

reviews = APIRouter(prefix="/reviews", tags=["Reviews"])

@reviews.post("/", response_model=ReviewOut, status_code=201)
def create_review(data: ReviewIn, current=Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(Booking).filter(Booking.user_id == current.id, Booking.event_id == data.event_id,
                                     Booking.status == BookingStatus.ATTENDED).first():
        raise HTTPException(403, "You can only review events you attended")
    if db.query(Review).filter(Review.user_id == current.id, Review.event_id == data.event_id).first():
        raise HTTPException(409, "You already reviewed this event")
    r = Review(user_id=current.id, **data.model_dump()); db.add(r); db.commit(); db.refresh(r)
    return db.query(Review).options(joinedload(Review.user)).filter(Review.id == r.id).first()


@reviews.get("/event/{event_id}", response_model=dict)
def event_reviews(event_id: int, page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50),
                  db: Session = Depends(get_db)):
    if not db.query(Event).filter(Event.id == event_id).first(): raise HTTPException(404, "Event not found")
    q = db.query(Review).options(joinedload(Review.user)).filter(Review.event_id == event_id, Review.is_visible == True).order_by(Review.created_at.desc())
    items, total = paginate(q, page, per_page)
    avg = db.query(func.avg(Review.rating)).filter(Review.event_id == event_id, Review.is_visible == True).scalar()
    return {"reviews": [ReviewOut.model_validate(r) for r in items], "total": total,
            "page": page, "per_page": per_page, "total_pages": total_pages(total, per_page),
            "average_rating": round(float(avg), 2) if avg else None}


@reviews.delete("/{review_id}", response_model=Msg)
def delete_review(review_id: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(Review).filter(Review.id == review_id).first()
    if not r: raise HTTPException(404, "Review not found")
    if current.role != UserRole.ADMIN and r.user_id != current.id: raise HTTPException(403, "Cannot delete this review")
    db.delete(r); db.commit(); return Msg(message="Review deleted")


# ══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

notifications = APIRouter(prefix="/notifications", tags=["Notifications"])

@notifications.get("/", response_model=dict)
def get_notifications(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=50),
                      unread_only: bool = False, current=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.user_id == current.id)
    if unread_only: q = q.filter(Notification.is_read == False)
    q = q.order_by(Notification.created_at.desc())
    items, total = paginate(q, page, per_page)
    unread = db.query(func.count(Notification.id)).filter(Notification.user_id == current.id, Notification.is_read == False).scalar() or 0
    return {"notifications": [NotificationOut.model_validate(n) for n in items], "total": total,
            "page": page, "per_page": per_page, "total_pages": total_pages(total, per_page), "unread_count": unread}


@notifications.post("/{nid}/read", response_model=NotificationOut)
def mark_read(nid: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == nid, Notification.user_id == current.id).first()
    if not n: raise HTTPException(404, "Notification not found")
    n.is_read = True; db.commit(); db.refresh(n); return n


@notifications.post("/read-all", response_model=Msg)
def mark_all_read(current=Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current.id, Notification.is_read == False).update({"is_read": True})
    db.commit(); return Msg(message="All notifications marked as read")


@notifications.delete("/{nid}", response_model=Msg)
def delete_notification(nid: int, current=Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == nid, Notification.user_id == current.id).first()
    if not n: raise HTTPException(404, "Notification not found")
    db.delete(n); db.commit(); return Msg(message="Notification deleted")


# ─── Register all sub-routers ─────────────────────────────────────────────────

router.include_router(auth)
router.include_router(users)
router.include_router(events)
router.include_router(bookings)
router.include_router(payments)
router.include_router(analytics)
router.include_router(reviews)
router.include_router(notifications)
