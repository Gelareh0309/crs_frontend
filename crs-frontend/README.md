# سامانه انتخاب واحد (CRS Frontend)

**Course Registration System — Frontend**

A Persian (RTL) web frontend for a university course registration system. It supports three user roles: **Admin**, **Professor**, and **Student**. The UI is built with plain HTML, CSS, and JavaScript and talks to a REST API backend.

> **Quick start:** The only thing you need is to run the backend project, then open `index.html` in your browser.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [How to Run](#how-to-run)
- [Backend API Requirements](#backend-api-requirements)
- [User Roles & Login Flow](#user-roles--login-flow)
- [Pages & Navigation](#pages--navigation)
- [Development Notes](#development-notes)
- [Browser Support](#browser-support)

---

## Features

### All users
- **Login** (`index.html`): Username/password, optional “remember me”, password visibility toggle, demo login button.
- **JWT auth**: Token stored in `localStorage` (remember) or `sessionStorage`; sent as `Authorization: Bearer <token>`.
- **Role-based redirect**: After login, user is sent to the correct dashboard by role (admin → professor → student).
- **Logout**: Clears token and redirects to `index.html`.
- **RTL & Persian**: Layout and labels in Persian with right-to-left direction.

### Admin dashboard (`dashboard-admin.html`)
- **Overview**: Lesson count, recent activity.
- **Lessons**: CRUD for lessons (title, credits, type, major, code, prerequisites, etc.).
- **Faculties**: CRUD for faculties.
- **Majors**: CRUD for majors (linked to faculty).
- **Classrooms**: CRUD for classrooms (number, capacity, faculty).
- **Sections**: CRUD for sections (lesson, professor, classroom, capacity, schedule rows with day/time).
- **Students**: List students, create/edit/delete student accounts.
- **Professors**: List professors, create/edit/delete professor accounts.
- **Create user**: Multi-step form to add **Student**, **Professor**, or **Admin** (personal info, contact, password, role-specific fields like major/faculty).
- **Profile**: Change password (current + new).
- **Confirm modal**: Reusable confirmation for delete actions.

### Professor dashboard (`dashboard-professor.html`)
- **All sections**: Read-only list of all sections with search (lesson, class, day).
- **My sections**: Sections assigned to the logged-in professor; capacity and enrolled count.
- **Students modal**: Open a section to see enrolled students; **remove student from section** (red “حذف از کلاس” button) with confirmation.

### Student dashboard (`dashboard-student.html`)
- **All sections**: Search sections, view details; **enroll** button when allowed (checks academic status and prerequisites).
- **My enrollments**: List of enrolled sections; **drop** (حذف واحد) to unenroll.

---

## Tech Stack

- **HTML5** (semantic markup, `lang="fa"`, `dir="rtl"`).
- **CSS3** (custom properties, flexbox, grid, no framework).
- **Vanilla JavaScript** (ES6+), no build step, no package manager.
- **Fetch API** for HTTP; JWT in `Authorization` header.

**No** Node/npm, no bundler, no framework — static files only.

---

## Project Structure

```
crs-frontend/
├── index.html              # Login page (entry point)
├── dashboard-admin.html    # Admin panel
├── dashboard-professor.html
├── dashboard-student.html
├── css/
│   ├── login.css           # Login page styles
│   └── dashboard-admin.css # Shared dashboard styles (admin, professor, student)
├── js/
│   ├── api.js              # API_BASE, apiFetch(), defaultHeaders() — used by login + professor + student
│   ├── auth.js             # Login form, token storage, role redirect
│   ├── dashboard-admin.js  # Admin logic (owns its own API_BASE + apiFetch)
│   ├── dashboard-professor.js
│   └── dashboard-student.js
├── images/
│   ├── logo.jpg
│   └── avatar.jpg
└── README.md
```

**Script loading:**
- **Login**: `api.js` → `auth.js`
- **Admin**: `dashboard-admin.js` only (includes its own API base and fetch).
- **Professor**: `api.js` → `dashboard-professor.js`
- **Student**: `api.js` → `dashboard-student.js`

---

## Prerequisites

1. A **backend API** that implements the endpoints described in [Backend API Requirements](#backend-api-requirements).
2. **CORS**: Backend must allow requests from the origin where you serve the frontend (e.g. `http://localhost:5500` or `file://` if you open files directly — not recommended for production).
3. **Browser**: Modern browser with ES6+ and Fetch support (see [Browser Support](#browser-support)).

---

## Configuration

### API base URL

The frontend calls a single backend base URL.

| File | Variable | Default |
|------|----------|--------|
| `js/api.js` | `API_BASE` | `'http://localhost:3001'` |
| `js/dashboard-admin.js` | `API_BASE` | `'http://localhost:3001'` |

**To change the backend URL:**

1. **Login, Professor, Student**: Edit `API_BASE` in `js/api.js`.
2. **Admin**: Edit `API_BASE` in `js/dashboard-admin.js`.

Use the same value in both places if you use one backend (e.g. `http://localhost:3001` or `https://api.your-university.edu`).

---

## How to Run

1. **Run the backend project** (API server).
2. **Open `index.html`** in your browser (directly or via a local HTTP server).

### Option 1: Local HTTP server (recommended)

Serving over HTTP avoids many CORS and `file://` limitations.

**Using Python 3:**
```bash
# From project root (crs-frontend/)
python3 -m http.server 8080
```
Then open: `http://localhost:8080` (or `http://127.0.0.1:8080`).  
Entry point: `http://localhost:8080/index.html`.

**Using Node (e.g. `npx`):**
```bash
npx serve -p 8080
# or
npx http-server -p 8080
```

**Using PHP:**
```bash
php -S localhost:8080
```

### Option 2: Open file directly

You can open `index.html` in the browser via `file://`. This may hit CORS if the API is on another origin; use a local server for reliable behavior.

### After the app is running

1. Open the app URL (e.g. `http://localhost:8080/` or `http://localhost:8080/index.html`).
2. Log in with credentials provided by your backend (or use the demo button if configured).
3. You will be redirected to:
   - **Admin** → `dashboard-admin.html`
   - **Professor** → `dashboard-professor.html`
   - **Student** → `dashboard-student.html`

---

## Backend API Requirements

The backend must expose a REST API with the following (or compatible) contracts. All authenticated requests use:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

### Auth
- **POST** `/login`  
  Body: `{ "username", "password" }`  
  Response: `{ "accessToken" }` (or `access` / `token`). Optional: `refreshToken`.  
  JWT payload should include at least one of: `role`, `roles`, `user.role`, `user.roles` (and optionally `firstName`, `lastName`, `username` for display).

### Admin
- **GET/POST** `/lesson-admin` — list, create lessons  
- **GET/PUT/DELETE** `/lesson-admin/:id`  
- **GET/POST** `/faculty` — list, create faculties  
- **GET/PUT/DELETE** `/faculty/:id`  
- **GET/POST** `/major` — list, create majors (body can include `faculty` reference)  
- **GET/PUT/DELETE** `/major/:id`  
- **GET/POST** `/classroom` — list, create classrooms  
- **GET/PUT/DELETE** `/classroom/:id`  
- **GET/POST** `/section` — list, create sections (with lesson, professor, classroom, capacity, schedule)  
- **GET/PUT/DELETE** `/section/:id`  
- **GET/POST** `/student` — list, create students  
- **GET/PUT/DELETE** `/student/:id`  
- **GET/POST** `/professor` — list, create professors  
- **GET/PUT/DELETE** `/professor/:id`  
- **POST** `/admin` — create admin user  
- **POST** `/change-password` — body e.g. `{ "oldPassword", "newPassword", "confirmNewPassword" }`

### Professor
- **GET** `/section` — all sections  
- **GET** `/section/professor/my-sections` — sections of logged-in professor  
- **GET** `/section/:sectionId` — section detail  
- **DELETE** `/section/:sectionId/student/:studentId` — remove student from section  

### Student
- **GET** `/section?search=...` — list/search sections  
- **GET** `/student/me/academic-status` — returns e.g. `{ enrolledSectionIds, passedLessonIds }`  
- **GET** `/section/student/my-sections` — enrolled sections  
- **POST** `/section/:sectionId/enroll` — enroll in section  
- **POST** `/section/:sectionId/drop` — drop section  

Response shapes (arrays, ids, nested objects) should match what the frontend expects in each dashboard (lessons, sections, students, etc.); adjust backend or frontend if your API differs.

---

## User Roles & Login Flow

1. User opens `index.html` and enters username/password (or uses demo button).
2. **POST** `/login` is called; response must include an access token.
3. Token is stored in `localStorage` (if “remember me”) or `sessionStorage`.
4. Frontend decodes the JWT (base64 payload) and reads `role` (or `roles[0]`).
5. Redirect:
   - `admin` → `dashboard-admin.html`
   - `professor` / `teacher` → `dashboard-professor.html`
   - otherwise → `dashboard-student.html`
6. Subsequent API calls send `Authorization: Bearer <token>`.
7. Logout clears token and redirects to `index.html`.

---

## Pages & Navigation

| Page | URL | Purpose |
|------|-----|--------|
| Login | `index.html` | Login form, demo button, redirect by role |
| Admin | `dashboard-admin.html` | Full CRUD for faculties, majors, classrooms, lessons, sections, students, professors; create user; profile (change password) |
| Professor | `dashboard-professor.html` | View all sections, “my sections”, open students modal, remove student from section |
| Student | `dashboard-student.html` | Search sections, enroll, view “my enrollments”, drop |

Dashboards use a sidebar to switch panels (no URL routing). Admin has panels: Overview, Faculty, Major, Classroom, Section, Student, Professor, Lessons, Create user, Profile.

---

## Development Notes

- **Two API bases**: `api.js` (login, professor, student) and `dashboard-admin.js` (admin). Keep both in sync when changing the backend URL.
- **No auth guard on dashboard load**: If the token is missing or invalid, API calls will fail; consider adding a check on load and redirect to `index.html` if needed.
- **RTL**: All dashboards use `dir="rtl"` and Persian labels; layout is in `dashboard-admin.css`.
- **Buttons**: `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.danger`, `.btn.small` are used; danger (e.g. remove student) is styled red in CSS.
- **Modals**: Admin uses overlay + modal for forms and confirm; professor uses a modal for section students.

---

## Browser Support

- Chrome, Firefox, Safari, Edge (recent versions).
- Requires: ES6+ (e.g. `async/await`, `fetch`, `Promise`), CSS Grid/Flexbox, `localStorage`/`sessionStorage`.

---

## Summary for New Developers

1. **Run a local server** from the project root (e.g. `python3 -m http.server 8080`).
2. **Set `API_BASE`** in `js/api.js` and `js/dashboard-admin.js` to your backend URL.
3. **Ensure the backend** implements the auth and role-based endpoints above and allows CORS from your frontend origin.
4. **Log in** via `index.html`; you will be redirected to the correct dashboard by role.
5. Use **Admin** for full CRUD and user creation, **Professor** for “my sections” and removing students, **Student** for enroll/drop.

For questions or issues, refer to the backend API docs and the endpoint list in this README.
