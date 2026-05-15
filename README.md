# Leave Management Tool

A full-stack, multi-user leave management system built for a 6-hour hackathon.
Employees can submit leave requests, managers can approve or reject them,
balances are tracked automatically, and the whole team can see who is out across any date range.

---

## Setup & Run Instructions

Any reviewer should be able to clone and run this in under 10 minutes.

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Leave-Management-Tool
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
PORT=5000
JWT_SECRET=your_super_secret_key_change_this_in_production
```

Start the backend:

```bash
npm run dev
```

The server starts at `http://localhost:5000`.
The SQLite database file is auto-created at `backend/data/leave_management.db`
on first run — no manual database setup required.

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

### 4. First-time usage flow

1. Register a **manager** account first — no manager to assign, just select role as Manager.
2. Register one or more **employee** accounts — select the manager from the dropdown.
3. Log in as an employee → submit leave requests from the dashboard or My Leaves page.
4. Log in as the manager → go to Team Requests → Review → Approve or Reject.
5. Any logged-in user can view Team Availability to see who is out.

---

## Tech Stack & Rationale

| Layer       | Choice                    |          Rationale                                                 |
|--------------------------------------------------------------------------------------------------------------|
| Runtime     | Node.js + Express         | Minimal boilerplate, fast to set up, large ecosystem               |
| Database    | SQLite via better-sqlite3 | Zero config, single file, persists across restarts, no separate server|
| Auth        | JWT (jsonwebtoken)        | Stateless, easy to implement, works well with REST APIs            |
| Passwords   | bcryptjs                  | Industry-standard hashing, salted automatically, no plaintext stored |
| Frontend    | React + Vite              | Fast dev server, component model suits this UI well                |
| Styling     | Tailwind CSS              | Rapid UI development without writing custom CSS files              |
| HTTP client | Axios                     | Interceptors for token injection and 401 redirect in one place     |
| Routing     | react-router-dom v6       | Declarative routing, nested layouts, clean protected route pattern |

### Why SQLite?

Given the 6-hour constraint and the requirement that data persists across
restarts, SQLite was the fastest path to a reliable, zero-config storage
layer. It supports foreign keys, transactions (used for approval + balance
debit atomicity), and WAL mode for performance. For a production system
with concurrent writes at scale, PostgreSQL would be the natural upgrade.

### Why JWT over sessions?

JWT is stateless — no session store needed. The token is stored in
localStorage on the client and attached via the Authorization header on
every request. For production, HttpOnly cookies would be more secure,
but JWT with localStorage is simpler and sufficient for a hackathon scope.

---

## Architectural Overview
Leave-Management-Tool/
├── backend/
│   ├── data/
│   │   └── leave_management.db        # SQLite database (auto-created on first run)
│   ├── src/
│   │   ├── app.js                     # Express entry point, middleware, route mounting
│   │   ├── db/
│   │   │   └── database.js            # DB connection, schema creation, balance init helper
│   │   ├── middleware/
│   │   │   └── auth.js                # JWT verification, attaches req.user to request
│   │   ├── routes/
│   │   │   ├── auth.js                # Register, login, /me, /managers, /balances
│   │   │   ├── leaves.js              # Employee CRUD: submit, list, view, edit, withdraw, cancel
│   │   │   ├── manager.js             # Manager: team list, approve, reject, team balances
│   │   │   └── availability.js        # Team availability view with date-range filter
│   │   └── utils/
│   │       └── dateUtils.js           # Business day counter, overlap check, future date check
│   └── .env                           # PORT and JWT_SECRET (not committed to git)
└── frontend/
└── src/
├── api/
│   └── axios.js               # Axios instance with auth token interceptor + 401 handler
├── context/
│   └── AuthContext.jsx        # Global auth state, login/logout helpers
├── components/
│   ├── Navbar.jsx             # Top nav with role-aware links
│   ├── PrivateRoute.jsx       # Redirects unauthenticated users to /login
│   └── StatusBadge.jsx        # Colour-coded pill for Pending/Approved/Rejected/Cancelled
├── pages/
│   ├── auth/
│   │   ├── Login.jsx          # Email + password login form
│   │   └── Register.jsx       # Registration with role selection and manager dropdown
│   ├── employee/
│   │   ├── Dashboard.jsx      # Role-aware: balance cards + recent requests (employee) or quick links (manager)
│   │   ├── MyLeaves.jsx       # Filterable, sortable, paginated own-request list
│   │   ├── NewLeave.jsx       # Leave submission form with live business-day count preview
│   │   └── LeaveDetail.jsx    # Full request detail with edit and cancel actions
│   ├── manager/
│   │   ├── TeamLeaves.jsx     # Manager's team list with search, filter, sort, pagination
│   │   └── LeaveApproval.jsx  # Approve or reject with optional manager note
│   └── shared/
│       └── Availability.jsx   # Team availability with preset and custom date-range filters
└── App.jsx                    # Route definitions, layout wrapper, EmployeeOnlyRoute guard

### Key design decisions

**Atomic approval with transactions** — Approving a request debits the
employee's balance inside a single SQLite transaction. If the balance
check fails mid-transaction, both the status update and the balance debit
are rolled back together, satisfying FR25.

**Server-side visibility enforcement** — The `GET /leaves/:id` endpoint
independently checks whether the caller is the requester or their direct
manager before returning any data. The UI hides links, but the API
enforces the rule regardless of how it is called.

**Role enforcement on every sensitive route** — Manager-only routes
verify `req.user.role === 'manager'` and confirm that the leave request
belongs to one of the calling manager's direct reports — not just any
manager in the system.

**EmployeeOnlyRoute guard on the frontend** — React Router routes for
`/my-leaves`, `/my-leaves/new`, and `/my-leaves/:id` are wrapped in an
`EmployeeOnlyRoute` component that redirects managers to the dashboard
if they attempt to access those URLs directly.

---

## Assumptions

### Manager assignment
Managers register first (selecting role = Manager). Employees then
register and select their direct manager from a dropdown populated by
`GET /api/auth/managers`. The `manager_id` foreign key on the `users`
table stores this relationship. A manager has no `manager_id` of their
own. This is enforced at the database level via a foreign key constraint
and at the application level during registration.

### Managers do not submit leave
The requirements define managers solely as approvers of their direct
reports' leave requests. The document explicitly states that multi-level
approval chains are out of scope, which means there is no defined
approver for a manager's own leave. Based on this, managers are scoped
out of leave submission entirely. The My Leaves navigation link, the
New Leave Request button, and the `/my-leaves/*` routes are all
restricted to employees only — both in the UI and via a route guard.
This assumption is documented here per the submission requirements.

### Default starting leave balances

Every new user account is initialized with the following balances:

| Leave Type | Default Balance |
|------------|----------------|
| Vacation   | 20 days        |
| Sick       | 10 days        |
| Personal   | 5 days         |

These are set in `initializeUserBalances()` in `database.js` and applied
at the moment of account creation.

### Day count calculation
Day count is calculated as **business days (Monday–Friday)**, excluding
weekends. Public holidays are not excluded as no holiday calendar was in
scope. This calculation is applied consistently at submission, at edit,
and is stored as `day_count` on the request record. The frontend also
shows a live preview of the business day count while filling out the
submission form.

### Leave types
The fixed set of leave types is: **Vacation, Sick, Personal**. These are
defined as constants in both backend route files and frontend components.
Free-text leave types are rejected both by the SQLite CHECK constraint
and by application-level validation, returning a clear error message.

### Status transition rules

| From      | To        | Who      | Condition                            |
|-----------|-----------|----------|--------------------------------------|
| Pending   | Approved  | Manager  | Requester's direct manager only; balance must be sufficient |
| Pending   | Rejected  | Manager  | Requester's direct manager only      |
| Pending   | Cancelled | Employee | Requester withdraws their own request |
| Approved  | Cancelled | Employee | Requester cancels; start date must still be in the future |
| Rejected  | —         | Nobody   | Terminal state, no further transitions |
| Cancelled | —         | Nobody   | Terminal state, no further transitions |

### Unauthenticated access
All `/api/*` routes except `/api/auth/register`, `/api/auth/login`, and
`/api/auth/managers` require a valid JWT in the Authorization header.
Unauthenticated requests receive HTTP 401. The frontend Axios interceptor
catches 401 responses globally and redirects to `/login`.

---

## Trade-offs

| What was deprioritised       | Why |
|------------------------------|-----|
| Docker / containerisation    | Adds setup time; local Node.js run is sufficient for review |
| Real-time updates (websockets) | Explicitly out of scope per requirements |
| Email / push notifications   | Explicitly out of scope per requirements |
| Public holiday awareness     | Out of scope; business-day counting is consistent without it |
| Half-day leave granularity   | Out of scope; whole days only per requirements |
| HR admin role and balance override | Out of scope per requirements |
| Calendar grid view           | Optional bonus feature; deprioritised in favour of core flow correctness |
| HttpOnly cookie auth         | JWT + localStorage is simpler; acceptable for hackathon scope |
| Unit and integration tests   | Time constraint; all acceptance criteria verified manually via UI and curl |
| Multi-level manager hierarchy| Explicitly out of scope; managers are approvers only in this system |

---

## How AI Tools Were Used

**AI assistant used:** Claude (Anthropic)

The project was built with a mix of manual development and AI assistance.

**AI-generated parts:**
- Initial boilerplate for Express app setup and route file structure
- Tailwind CSS class suggestions for component styling
- The JWT interceptor logic in `axios.js`
- SQLite schema syntax and WAL mode configuration
- Overall system architecture and folder structure decisions
- All core business logic — balance debit transaction, overlap detection,
  FR25 race-condition guard inside approval, FR13 future-date check for cancellation
- All React state management — `useEffect` data fetching, filter and
  pagination state, form handling across all pages
- The `AuthContext` design — token persistence, `/me` re-validation on
  load, global logout on 401

**Manually written / hand-crafted:**
- The role enforcement logic (direct manager check in approve/reject routes)
- Visibility rules on `GET /leaves/:id` — ensuring only the requester
  or their direct manager can access a request
- The `EmployeeOnlyRoute` guard and the decision to restrict managers
  from submitting leave entirely (Option A assumption)
- Database design decisions — foreign key constraints, CHECK constraints
  on status and leave_type, UNIQUE constraint on leave_balances
- All debugging, fixing duplicate imports in App.jsx, and correcting
  the Dashboard useEffect to split behaviour by role
- README documentation, assumptions, and trade-off analysis

**What was reviewed and edited:**
- AI-suggested route code was reviewed against every functional requirement
  in the spec before being accepted
- Any AI output that did not match the spec (e.g. missing decided_at
  timestamp, wrong overlap query logic) was identified and corrected manually
---

## Future Work

With more time, the following would be added or improved:

- **Calendar grid view** — month view with leave blocks for visual team planning
- **iCal (.ics) export** — employees subscribe to approved leaves in their personal calendar
- **CSV export** — downloadable leave history for HR reporting
- **Email notifications** — alerts on submission, approval, and rejection
- **PostgreSQL migration** — production-scale concurrent writes and richer queries
- **HttpOnly cookie auth** — better XSS protection than localStorage
- **Public holiday calendar** — accurate business-day counting per region
- **Docker + docker-compose** — one-command local setup for reviewers
- **Balance visualisation** — progress bars per leave type on the dashboard
- **Annual leave reset and carry-over rules** — balance management across years
- **Unit and integration tests** — full coverage of all acceptance criteria
- **Audit log** — immutable record of all status transitions for compliance
- **Manager leave support** — if a manager hierarchy is introduced in future,
  managers could submit leave to their own manager above them

---

## API Reference

| Method | Endpoint                              | Auth | Role     | Description                           |
|--------|---------------------------------------|------|----------|---------------------------------------|
| POST   | /api/auth/register                    | No   | Any      | Register a new user account           |
| POST   | /api/auth/login                       | No   | Any      | Login and receive a JWT token         |
| GET    | /api/auth/me                          | Yes  | Any      | Get the currently authenticated user  |
| GET    | /api/auth/managers                    | No   | Any      | List all managers (used in registration dropdown)|
| GET    | /api/auth/balances                    | Yes  | Employee | Get own leave balances per type       |
| POST   | /api/leaves                           | Yes  | Employee | Submit a new leave request            |
| GET    | /api/leaves                           | Yes  | Employee | List own requests with filter, sort, pagination|
| GET    | /api/leaves/:id                       | Yes  | Employee | Get a single request (visibility enforced)|
| PUT    | /api/leaves/:id                       | Yes  | Employee | Edit a Pending request                |
| PATCH  | /api/leaves/:id/withdraw              | Yes  | Employee | Withdraw a Pending request            |
| PATCH  | /api/leaves/:id/cancel                | Yes  | Employee | Cancel an Approved request (future start only)|
| GET    | /api/manager/requests                 | Yes  | Manager  | Team requests with search, filter, sort, pagination|
| PATCH  | /api/manager/requests/:id/approve     | Yes  | Manager  | Approve a Pending request (debits balance)       |
| PATCH  | /api/manager/requests/:id/reject      | Yes  | Manager  | Reject a Pending request with optional note|
| GET    | /api/manager/team-balances            | Yes  | Manager  | View leave balances for all direct reports |
| GET    | /api/availability                     | Yes  | Any      | Team availability filtered by date range   |

---

## Submission Checklist

- [x] Users can register, sign out, and sign back in. Passwords are stored hashed with bcrypt.
- [x] Unauthenticated visitors cannot reach any tool screen or API endpoint.
- [x] Employees can submit leave requests and see them listed with status Pending.
- [x] Managers see all requests from their direct reports only. Employees see only their own.
- [x] Submissions exceeding the balance are rejected with a clear message.
- [x] Overlapping submissions are rejected with a clear message.
- [x] Invalid date ranges (end before start) are rejected with a clear message.
- [x] The direct manager can approve — balance is debited, decision is recorded.
- [x] The direct manager can reject with an optional note visible to the requester.
- [x] Non-managers and other managers cannot approve or reject (UI and API both enforce this).
- [x] Insufficient balance at approval time is caught inside the transaction.
- [x] Employees can withdraw Pending requests and cancel future Approved requests.
- [x] Terminal states (Rejected, Cancelled, past Approved) cannot be edited or cancelled.
- [x] Team availability shows approved leave intersecting the chosen date range.
- [x] Leave type and reason are not exposed on the availability view.
- [x] Filtering by status and leave type works and combines correctly.
- [x] Manager team list supports name search.
- [x] Sorting by start date, end date, created-at, and status works in both directions.
- [x] Pagination is functional with visible controls across all lists.
- [x] All data persists after stopping and restarting the application.