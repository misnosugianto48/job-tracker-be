# Job Tracker Backend API

The Node.js Express REST API server for the Job Application Tracker CMS. Built with TypeScript, PostgreSQL, and Prisma 7 using a modular Controller-Repository pattern.

---

## 🛠️ Tech Stack & Structure
*   **Runtime & Framework**: Node.js & Express (TypeScript)
*   **Database ORM**: Prisma 7 (configured with `@prisma/adapter-pg` driver adapter)
*   **Security & Helpers**: Helmet (secure HTTP headers), CORS, Dotenv
*   **Testing**: Jest, Supertest, and `ts-jest`

---

## 📂 Repository-Controller Architecture
*   `src/lib/`: Database configuration and raw PG pool export.
*   `src/repositories/`: Direct database queries via Prisma Client (isolated SQL layer).
*   `src/controllers/`: Route handlers validating input and coordinating repositories.
*   `src/routes/`: Express router endpoint mapping.
*   `src/tests/`: API integration test suites.

---

## 🚀 Local Installation & Run

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in this directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/job_tracker?schema=public"
PORT=5000
```

### Step 3: Run Database Migrations
Create your local database schemas using Prisma:
```bash
npx prisma migrate dev
```

### Step 4: Run Dev Server
Start the development server with hot-reloading (via nodemon):
```bash
npm run dev
```
*The server will boot on `http://localhost:5000`.*

---

## 🧪 Running Automated Tests

Run the Jest integration test suite (covers endpoint health checks and the complete Company CRUD lifecycle):
```bash
npm run test
```
*Note: The tests execute against the database specified in your `.env` file. Tests clean up created mock data automatically and close all connection pools upon completion.*

---

## 🐳 Docker Containerization
This backend contains a multi-stage `Dockerfile` compiled for production.
To build and run this container individually (ensure PostgreSQL is running elsewhere):
```bash
docker build -t job-tracker-backend .
docker run -p 5000:5000 --env-file .env job-tracker-backend
```
