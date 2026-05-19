# 🎟️ SmartEvent — Smart Event & Booking Management System

> A full-stack, production-grade event management and booking platform built for organizers and attendees across Africa.

![SmartEvent](https://img.shields.io/badge/SmartEvent-v1.0.0-b87333?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss)

---

## 📋 Project Overview

SmartEvent is a comprehensive event management and booking platform that allows:

- **Administrators** to manage the entire platform — users, events, payments, analytics
- **Event Managers** to create and manage their own events, track bookings and revenue
- **Clients** to browse events, book tickets, make payments, and download QR-coded tickets

The system simulates a real production-level platform used by event companies, conference organizers, training centers, and business agencies across Africa.

---

## ✨ Features

### 🔐 Authentication & Authorization
- User Registration with password strength validation
- Secure Login with JWT (access + refresh tokens)
- **Login lockout** — account locked for 1 minute after 3 failed attempts
- Role-Based Access Control (Admin, Event Manager, Client)
- Protected routes with automatic redirect
- Password change with bcrypt hashing (12 rounds)

### 📊 Dashboard (Role-Based)
- **Admin** — Full platform stats, all events, all bookings, user management, revenue reports
- **Event Manager** — Their events only, their bookings, their revenue, check-in management
- **Client** — Personal bookings, payment status, AI-recommended events, QR tickets

### 📅 Event Management
- Create, edit, delete events with full details
- Upload cover images and banners
- Set ticket tiers (General, VIP, Early Bird, Student, Group)
- Publish / cancel events with automatic attendee notification
- Featured events system
- Category-based browsing (Conference, Concert, Workshop, Training, etc.)

### 🎟️ Booking System
- Browse and search events with advanced filters
- Book tickets with quantity selection
- View booking history with status tracking
- Cancel bookings (seats restored automatically)
- QR code ticket generation (base64 PNG, scannable)
- Download and print tickets

### 💳 Payment System
- Simulated payment processing (Card, Cash, Mobile Money)
- Unpaid bookings visible immediately after booking
- Pay Now button for pending payments
- Admin refund processing (full or partial)
- Payment history with transaction IDs and receipt numbers

### 📈 Analytics & Reports
- Monthly revenue charts (line chart)
- Bookings by category (donut chart)
- Top performing events (horizontal bar chart)
- User growth tracking
- **PDF export** — professional branded report with all tables
- Admin-only user statistics breakdown

### 🔔 Notifications
- In-app notification system
- Booking confirmation, cancellation, payment alerts
- Mark as read (individual or all)
- Unread count badge on sidebar

### ✅ Check-In System
- QR code scanner / manual reference entry
- Live attendance counter per event (checked in vs remaining)
- Real-time stats refresh

### 🌓 Theme
- Matte Black + Copper + Ivory color system

### 📄 Public Pages
- Home with animated hero carousel and AI-recommended events
- Events listing with search, filters, and pagination
- Event detail with booking modal
- About, Contact, Pricing, FAQ, Terms, Privacy

---

## 🛠️ Technologies Used

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | REST API framework |
| **SQLAlchemy** | ORM for database models |
| **SQLite / PostgreSQL** | Database |
| **Pydantic** | Request/response validation |
| **python-jose** | JWT authentication |
| **passlib[bcrypt]** | Password hashing |
| **qrcode[pil]** | QR code generation |
| **Pillow** | Image processing |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **TailwindCSS v4** | Styling |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client with interceptors |
| **TanStack Query** | Server state management |
| **Recharts** | Analytics charts |
| **jsPDF + jspdf-autotable** | PDF report export |
| **Lucide React** | Icon library |
| **shadcn/ui** | UI components (toasts, dialogs) |

---

## 📁 Project Structure

```
smartevent/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── seed.py              # Database seeder
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variables template
│   └── app/
│       ├── core.py          # Config · Database · Security · Auth
│       ├── models.py        # All SQLAlchemy models + enums
│       ├── schemas.py       # All Pydantic schemas
│       ├── routes.py        # All API endpoints (50+ routes)
│       └── utils.py         # QR codes · file upload · helpers
│
└── frontend/
    ├── src/
    │   ├── App.tsx              # Router + lazy loading
    │   ├── api/client.ts        # Axios client + API helpers
    │   ├── context/AuthContext.tsx  # JWT auth context
    │   ├── lib/
    │   ├── components/          # Navbar, Sidebar, QRModal, etc.
    │   ├── pages/               # Public pages
    │   └── pages/dashboard/     # Dashboard pages by role
    ├── index.css                # TailwindCSS v4 + design tokens
    └── .env.example             # Frontend environment template
```

---

## 🚀 Installation Steps

### Prerequisites
Make sure these are installed on your machine:

```bash
# Check versions
python --version    # 3.10+
node --version      # 18+
npm --version       # 9+
git --version
```

### 1. Clone the Repository

```bash
git clone https://github.com/NexventuresLtd/belyse_final_2026.git
cd belyse_final_2026
```

---

## ⚙️ Environment Setup

### Backend `.env`

```bash
cd backend
cp .env.example .env
```

Open `.env` and configure:

```env
# App
APP_NAME="Smart Event & Booking Management System"
DEBUG=True
ENVIRONMENT=development

# Database (SQLite for local dev)
DATABASE_URL=sqlite:///./smart_events.db

# For PostgreSQL (production):
# DATABASE_URL=postgresql://user:password@localhost:5432/smart_events_db

# Security — CHANGE THIS to a random 32+ char string
SECRET_KEY=your-super-secret-key-minimum-32-characters-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Login lockout settings
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_DURATION_MINUTES=1

# CORS — add your frontend URL
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# File uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=5
```

### Frontend `.env`

```bash
cd frontend
cp .env.example .env
```

Open `.env`:

```env
# FastAPI backend URL
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 🗄️ Database Configuration

###  — PostgreSQL (Recommended for production)

1. Install PostgreSQL and create a database:
```sql
CREATE DATABASE smart_events_db;
CREATE USER smartevent_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE smart_events_db TO smartevent_user;
```

2. Update `.env`:
```env
DATABASE_URL=postgresql://smartevent_user:yourpassword@localhost:5432/smart_events_db
```

3. Install the PostgreSQL driver (already in requirements.txt):
```bash
pip install psycopg2-binary
```

---

## 🔌 API Setup

### Backend Installation

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Seed the Database

```bash
# Creates all tables + default accounts + sample data
python seed.py
```

**Default Accounts Created:**

| Role | Email | Password |
|---|---|---|
| Admin | admin@smartevents.com | Admin@1234 |
| Event Manager | manager@smartevents.com | Manager@1234 |
| Client | john@example.com | Client@1234 |
| Client | jane@example.com | Client@1234 |

### Frontend Installation

```bash
cd frontend

# Install all dependencies
npm install

# Install PDF export libraries
npm install jspdf jspdf-autotable
```

---

## ▶️ Run Instructions

Open **two terminals**:

### Terminal 1 — Backend

```bash
cd backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**  
Swagger API docs: **http://localhost:8000/docs**  
ReDoc: **http://localhost:8000/redoc**

### Terminal 2 — Frontend

```bash
cd frontend

npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 📡 API Documentation

Once the backend is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (returns JWT) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/events` | List all events |
| POST | `/api/v1/events` | Create event (manager+) |
| GET | `/api/v1/events/{id}` | Get event details |
| POST | `/api/v1/bookings` | Create booking |
| GET | `/api/v1/bookings/my` | Get my bookings |
| POST | `/api/v1/payments` | Process payment |
| GET | `/api/v1/analytics/dashboard` | Dashboard stats |
| GET | `/api/v1/analytics/summary` | Full analytics |
| GET | `/api/v1/notifications` | Get notifications |

### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## 🌐 Deployment

### Frontend — Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

cd frontend
vercel

# Set environment variable in Vercel dashboard:
# VITE_API_URL = https://your-backend.onrender.com/api/v1
```

### Backend — Render (Recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables in the Render dashboard (copy from `.env`)
6. For PostgreSQL: Add a Render PostgreSQL database and copy the connection URL

### Backend — Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

cd backend
railway login
railway init
railway up
```

---

## 🔒 Security Features

- **bcrypt** password hashing (12 rounds)
- **JWT** access tokens (30 min) + refresh tokens (7 days)
- **Login lockout** — 3 failed attempts = 1 minute ban
- **Role-based access** on every endpoint
- **CORS** configured for frontend origin only
- **Input validation** via Pydantic schemas

---

## 👥 Team

Built as a final assessment project for **Nexventures Ltd** — 2026.

---

## 📄 License

This project is submitted as an individual academic assessment.  
© 2026 SmartEvent — All rights reserved.