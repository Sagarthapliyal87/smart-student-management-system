# Smart Student Management System

A role-based college management web app with **Student, Teacher, Parent and Admin** panels, built with
**React (Vite) + Tailwind CSS**, **Node.js + Express**, **Prisma** and **MySQL**.

---

## 1. Features

| Area | What works |
|---|---|
| **Authentication** | Login/logout, bcrypt-hashed passwords, JWT sessions, role-based routes (frontend + backend), accounts created by the Admin only, profile editing, password change, profile photo |
| **Admin** | Students / Teachers / Parents (create, edit, deactivate, link parent to student), courses, classes, subjects, assign subjects to teachers, timetable, exam schedule, fees + payments + receipts, notices, reports, dashboard with charts |
| **Teacher** | Dashboard, mark attendance (only for own subjects), enter/edit marks, create assignments (with attachment), grade submissions, upload study material, post notices, AI question generator |
| **Student** | Dashboard (attendance, average marks, SGPA, today's classes, pending assignments, upcoming exams, notices, activity, low-attendance warning), attendance, marks + SGPA + target calculator, assignments (upload answer), timetable, notes, fees, documents, notices, AI tools, profile |
| **Parent** | Dashboard per linked child: attendance, marks, SGPA, assignments, upcoming exams, fees, notices |
| **Notifications** | Bell in the navbar. Created automatically for: new assignment, new marks, graded assignment, new notes, new notice, exam scheduled, fee created / payment received, low attendance |
| **Reports** | Attendance, marks, fees, department. View in the browser, **download CSV** (opens in Excel), or **Print / Save as PDF** from the browser |
| **AI (optional)** | Study assistant, doubt solver, notes generator, question generator, study planner, performance analysis (uses the student's real marks). Called from the backend only. Without an API key these pages show a clear message and the rest of the app works normally |
| **UI** | Responsive layout, mobile sidebar, loading / empty / error states, toasts, confirmation dialogs, search, filters, pagination, charts |

### Not included (honest list)
- Light/dark mode, QR/face/biometric attendance, OCR, voice assistant, multi-language, offline mode, email/SMS/WhatsApp sending, real-time (Socket.io) notifications. Notifications are in-app and load when the page loads.
- Photo/image upload to the AI doubt solver (text only).
- Parent-to-teacher messaging UI (the `messages` table exists in the schema, but there is no screen for it).
- Fee payments are recorded by the Admin; there is no online payment gateway.
- PDF is produced with the browser's "Print / Save as PDF", not generated on the server.
- SGPA uses an **equal-weight average of subject grade points** (the system does not model credits). CGPA across semesters is not computed because only the current semester's data model is used.

---

## 2. Requirements (Windows 10)

1. **Node.js LTS** (v18 or newer) - https://nodejs.org
2. **XAMPP** (for MySQL + phpMyAdmin) - https://www.apachefriends.org
3. **VS Code** (recommended)

---

## 3. Setup, step by step

Open **Command Prompt** (or the VS Code terminal) for each step.

### Step 1 - Start MySQL
Open the XAMPP Control Panel and click **Start** next to **MySQL**.

### Step 2 - Create the database
Open http://localhost/phpmyadmin -> **New** -> database name `student_management_db` -> **Create**.

### Step 3 - Backend
```bash
cd smart-student-management-system\backend
copy .env.example .env
npm install
```
Open `backend\.env` and set `JWT_SECRET` to any long random text. The default `DATABASE_URL`
already matches a fresh XAMPP install (user `root`, no password). If you gave MySQL a password,
write it as `mysql://root:YOURPASSWORD@localhost:3306/student_management_db`.

Create the tables and add demo data:
```bash
npx prisma migrate dev --name init
npm run seed
```
`migrate dev` reads `prisma/schema.prisma`, creates the `prisma/migrations` folder and builds all tables.
(If it asks to confirm, say yes. If you only want the tables without migration files, use `npx prisma db push` instead.)

Start the API:
```bash
npm run dev
```
You should see `API running on http://localhost:5000`. Check http://localhost:5000/api/health.

### Step 4 - Frontend (new terminal)
```bash
cd smart-student-management-system\frontend
npm install
npm run dev
```
Open **http://localhost:5173**.

---

## 4. Demo accounts (created by `npm run seed`)

Password for **all** accounts: `Password123!`

| Role | Email | Notes |
|---|---|---|
| Admin | admin@college.edu | Full control |
| Teacher | teacher@college.edu | Teaches DBMS and C++ |
| Teacher | teacher2@college.edu | Teaches OS and Software Engineering |
| Student | student@college.edu | Roll CSE2023001, has borderline-low DBMS attendance, marks, fees, assignments |
| Student | student2@college.edu, student3@..., student4@... | Other students in the same class |
| Parent | parent@college.edu | Linked to student@college.edu |

The login page also has one-click buttons that fill in these accounts.
Passwords are stored only as **bcrypt hashes** in the database.
Running `npm run seed` again **wipes and recreates** all data.

> Change these passwords before using the system for anything real.

---

## 5. Environment variables (`backend/.env`)

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Secret used to sign login tokens (**required**; the server refuses to start without it) |
| `JWT_EXPIRES_IN` | Session length, default `7d` |
| `PORT` | API port, default `5000` |
| `CLIENT_URL` | Frontend URL for CORS, default `http://localhost:5173` |
| `AI_API_KEY` | Optional OpenAI API key |
| `AI_MODEL` | Optional model name, default `gpt-4o-mini` |

Optional `frontend/.env`: `VITE_API_URL` (defaults to `http://localhost:5000`).

### AI configuration
1. Put your key in `backend/.env` as `AI_API_KEY=...`
2. Restart the backend.

The key stays on the server; the browser never sees it. Without a key, the AI pages show
"AI is not configured" and nothing else is affected. AI answers can be wrong - always verify.

---

## 6. Project structure

```
smart-student-management-system/
├── backend/
│   ├── prisma/            schema.prisma, seed.js  (migrations/ is created by `migrate dev`)
│   ├── src/
│   │   ├── config/        db.js (Prisma client)
│   │   ├── controllers/   business logic, one file per feature
│   │   ├── routes/        URL -> controller mapping + role rules
│   │   ├── middleware/    auth (JWT), roleCheck, upload (multer), errorHandler
│   │   ├── services/      aiService.js
│   │   ├── utils/         helpers.js (SGPA, attendance %), access.js (ownership checks)
│   │   └── server.js
│   ├── uploads/           profiles/ assignments/ documents/ notes/  (not committed)
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/    Table, Modal, Toast, Sidebar, Navbar, charts helpers ...
│       ├── layouts/       DashboardLayout
│       ├── pages/         auth/ student/ teacher/ parent/ admin/ shared/
│       ├── context/       AuthContext
│       ├── hooks/         useFetch
│       └── services/      api.js (Axios)
├── README.md
└── .gitignore
```

---

## 7. API overview (all under `/api`, JWT required except login)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Profile | `PUT /users/me`, `POST /users/me/photo` |
| People (Admin) | `/students`, `/teachers`, `/parents` (+ `/students/:id/parents`, `/teachers/:id/subjects`) |
| Academics | `/academics/courses`, `/academics/classes`, `/academics/subjects`, `/timetable`, `/exams` |
| Attendance | `POST /attendance`, `GET /attendance/roster`, `GET /attendance/student/:id` |
| Marks | `POST /marks`, `PUT /marks/:id`, `GET /marks/student/:id`, `GET /marks/target` |
| Assignments | `POST /assignments`, `GET /assignments/my`, `POST /assignments/:id/submit`, `PUT /assignments/submissions/:id/grade` |
| Content | `/study-materials`, `/documents`, `/notices`, `/notifications` |
| Fees | `POST /fees`, `GET /fees/all`, `GET /fees/student/:id`, `POST /fees/:id/pay` |
| Reports | `/reports/attendance|marks|fees|department` (`?format=csv`) |
| Dashboards | `/dashboard/student|teacher|parent|admin` |
| AI | `/ai/status`, `/ai/study-assistant`, `/ai/doubt-solver`, `/ai/notes-generator`, `/ai/question-generator`, `/ai/study-planner`, `/ai/performance-analysis` |

### Security notes
- Passwords: bcrypt. Tokens: JWT signed with `JWT_SECRET`. Password hashes are never returned by the API.
- Every route checks the role. Ownership is enforced on the server: students see only their own data,
  parents only their linked children, teachers can mark attendance / enter marks / create assignments /
  upload material **only for subjects assigned to them**.
- Uploads: type whitelist per category, 10 MB limit, random file names. Uploaded files are served from `/uploads` and are
  not committed to Git.
- Input is validated in the controllers and in the forms. Error responses go through one central handler.
- Accounts are deactivated, not deleted, so academic history is preserved.
- Not implemented: rate limiting, account lockout, password reset by email, audit logs. Add these before real-world use.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server` | Start MySQL in XAMPP; check `DATABASE_URL`; make sure the database exists |
| `JWT_SECRET is missing` | Create `backend/.env` from `.env.example` and set `JWT_SECRET` |
| Login page says "Cannot reach the server" | Backend is not running (`npm run dev` in `backend`) or the port differs from `VITE_API_URL` |
| CORS error in the browser console | `CLIENT_URL` in `backend/.env` must equal the frontend address |
| `@prisma/client did not initialize yet` | Run `npx prisma generate` in `backend` |
| `Port 5000 already in use` | Change `PORT` in `.env` and set `VITE_API_URL` in `frontend/.env` |
| Seed fails on a non-empty database | `npm run seed` wipes tables first; if the schema changed, run `npx prisma migrate reset` |
| Teacher sees "No subjects are assigned" | Admin -> Teachers -> Subjects -> assign a subject |
| Student's "Today's classes" is empty | The timetable has no slots for today (there are no Sunday classes) |
| AI shows "not configured" | Set `AI_API_KEY` and restart the backend |

Useful commands (inside `backend`): `npx prisma studio` (browse the database), `npx prisma migrate reset` (wipe + recreate).
