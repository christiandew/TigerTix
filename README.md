# TigerTix

A microservice-based event ticketing system for Clemson Campus Events with user authentication, real-time availability, and LLM-driven booking assistance powered by AI.

**TigerGPT Semester Project — Clemson University (CPSC 3720)**

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture Summary](#architecture-summary)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running Services Locally](#running-services-locally)
- [Testing & Regression Tests](#testing--regression-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [API Endpoints](#api-endpoints)
- [Team & Credits](#team--credits)
- [License](#license)
- [Troubleshooting](#troubleshooting)

## Project Overview

TigerTix is a full-stack event ticketing platform designed for the Clemson Campus community. The system enables users to:

- **Browse events** with real-time ticket availability
- **Purchase tickets** with instant inventory updates and concurrency handling
- **Create and manage events** through an admin dashboard
- **Use AI-powered booking assistance** with LLM-driven chat and voice support
- **Authenticate securely** with JWT-based authentication and HTTP-only cookies
- **Access the system** from any modern web browser

The project demonstrates real-world software engineering practices including microservices architecture, automated testing, CI/CD pipelines, and concurrency management.

---

## Tech Stack

### Frontend
- **React** 19.2.0 — Interactive UI library
- **React Router** (optional) — Client-side routing
- **React Testing Library** 16.3.0 — Component testing framework
- **Jest** 29.7.0 — Test runner and assertions

### Backend
- **Node.js** 18+ — JavaScript runtime
- **Express.js** 5.1.0 — RESTful API framework
- **SQLite3** 5.1.7 — Lightweight embedded database
- **bcryptjs** 2.4.3 — Password hashing for security
- **jsonwebtoken** 9.0.2 — JWT authentication
- **cookie-parser** 1.4.7 — HTTP cookie parsing
- **CORS** 2.8.5 — Cross-origin resource sharing
- **Supertest** 6.3.3 — HTTP assertion library for testing

### AI/LLM Integration
- **LLM API** (OpenAI, Anthropic, or local) — AI-powered booking assistant
- **Voice Support** — Web Speech API for voice input/output

### DevOps & CI/CD
- **GitHub Actions** — Automated testing and deployment
- **GitHub Pages** — Frontend hosting
- **Git** — Version control

---

## Architecture Summary

### Microservices Overview

TigerTix uses a microservices architecture with the following independent services:

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (port 3000)                │
│              Authentication UI • Event Listing               │
│             Ticket Purchase • LLM Chat Interface             │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST
        ┌──────────┼──────────┬───────────────┬──────────────┐
        │          │          │               │              │
        ▼          ▼          ▼               ▼              ▼
┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐
│   Auth      │ │  Admin   │ │  Client   │ │   LLM    │ │ Shared   │
│  Service    │ │ Service  │ │ Service   │ │ Service  │ │   DB     │
│ (port 6010) │ │ (6000)   │ │ (6001)    │ │ (6002)   │ │ SQLite   │
├─────────────┤ ├──────────┤ ├───────────┤ ├──────────┤ └──────────┘
│ • Register  │ │ • Create │ │ • List    │ │ • Chat   │
│ • Login     │ │ • Update │ │ • Purchase│ │ • Voice  │
│ • JWT Auth  │ │ • Delete │ │ • Concur- │ │ • AI     │
│ • Logout    │ │ • Events │ │   rency   │ │ Booking  │
│             │ │          │ │           │ │          │
└─────────────┘ └──────────┘ └───────────┘ └──────────┘
     ▲              ▲              ▲              ▲
     └──────────────┼──────────────┼──────────────┘
                    │
            ┌───────▼────────┐
            │   SQLite DB    │
            │  (tigertix.sqlite)
            │                │
            │ • events       │
            │ • users        │
            │ • purchases    │
            │ • bookings     │
            └────────────────┘
```

### Data Flow

1. **User Registration/Login**
   - Frontend submits credentials → Auth Service hashes password → JWT issued → Cookie stored
   - Frontend stores user state in React context

2. **Event Browsing**
   - Frontend requests events → Client Service queries SQLite → Events returned with availability

3. **Ticket Purchase**
   - Frontend sends purchase request → Client Service locks row (concurrency control) → Inventory updated → Response sent
   - Real-time availability reflected in UI

4. **Admin Operations**
   - Authenticated admin creates/updates events → Admin Service validates JWT → Database updated

5. **LLM Booking Assistance**
   - User speaks to LLM Service → Chat processed with AI context → Voice response synthesized

---

## Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for version control)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

## Project Structure

```
TigerTix/
├── backend/
│   ├── admin-service/
│   ├── client-service/
│   ├── llm-driven-booking/
│   ├── user-authentication/
│   ├── shared-db/
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
├── .github/
│   └── workflows/
│       └── ci-cd.yml
└── README.md
```

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/christiandew/TigerTix.git
cd TigerTix
```

### 2. Install Root Dependencies (Optional)

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Running Services Locally

### Quick Start (All Services)

Run all services with one command (from project root):

```bash
npm start
```

This starts:
- Frontend on **http://localhost:3000**
- User Authentication on **http://localhost:6010**
- Admin Service on **http://localhost:6000**
- Client Service on **http://localhost:6001**
- LLM Service on **http://localhost:6002**

### Manual Service Startup (in separate terminals)

#### Terminal 1: Frontend

```bash
cd frontend
npm start
```

Frontend opens automatically at **http://localhost:3000**.

#### Terminal 2: User Authentication Service

```bash
cd backend/user-authentication
npm install  # if not already done
npm start
```

Auth service listens on **http://localhost:6010**.

#### Terminal 3: Admin Service

```bash
cd backend/admin-service
npm start
```

Admin service listens on **http://localhost:6000**.

#### Terminal 4: Client Service

```bash
cd backend/client-service
npm start
```

Client service listens on **http://localhost:6001**.

#### Terminal 5: LLM Service

```bash
cd backend/llm-driven-booking
npm start
```

LLM service listens on **http://localhost:6002**.

### Database Initialization

The first time you start the backend services, the SQLite database is automatically initialized using `/backend/shared-db/init.sql`. No manual setup required.

## Testing & Regression Tests

### Run All Tests (Frontend + Backend)

```bash
# From project root
npm test
```

This runs:
- **Backend Integration Tests** — Jest tests for all microservices
- **Frontend Component Tests** — React Testing Library tests

### Run Backend Regression Tests Only

```bash
cd backend
npm test
```

**Backend Test Coverage:**
- `tests/integration.test.js` — End-to-end event creation, purchase, and update flows
- `tests/concurrency.test.js` — Race condition and concurrent purchase handling
- `tests/llm.test.js` — LLM service integration tests

### Run Frontend Unit Tests Only

```bash
cd frontend
npm test
```

**Frontend Test Coverage:**
- `App.test.js` — Main app component rendering
- `LlmChat.test.js` — Chat interface and voice functionality
- `LlmChat.a11y.test.js` — Accessibility (a11y) compliance tests

### Run Tests with Coverage Report

```bash
# Backend coverage
cd backend
npm test -- --coverage

# Frontend coverage
cd frontend
npm test -- --coverage --watchAll=false
```

### Watch Mode (Development)

```bash
# Backend tests (rerun on file change)
cd backend
npm test -- --watch

# Frontend tests (rerun on file change)
cd frontend
npm test -- --watch
```

### CI/CD Regression Testing

The GitHub Actions pipeline automatically runs all tests on every push to `main`. See `.github/workflows/ci-cd.yml` for automation details.

## CI/CD Pipeline

The project uses GitHub Actions for automated testing and deployment.

### What Happens on Push to `main`

1. **Install Dependencies** — Both frontend and backend
2. **Run Tests** — Backend + frontend tests run in parallel
3. **Deploy** — If tests pass, frontend builds and deploys to GitHub Pages

See `.github/workflows/ci-cd.yml` for detailed configuration.

## API Endpoints

### User Authentication Service (`http://localhost:6010`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in (returns JWT cookie) |
| `POST` | `/api/auth/logout` | Log out and clear token |
| `GET` | `/api/auth/profile` | Get current user profile (protected) |

**Example: Register**

```bash
curl -X POST http://localhost:6010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@clemson.edu","password":"SecurePass123"}' \
  -c cookies.txt
```

**Example: Login**

```bash
curl -X POST http://localhost:6010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@clemson.edu","password":"SecurePass123"}' \
  -c cookies.txt
```

**Example: Get Profile (requires cookie)**

```bash
curl http://localhost:6010/api/auth/profile -b cookies.txt
```

### Client Service (`http://localhost:6001`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/events` | List all events |
| `POST` | `/api/events/:id/purchase` | Purchase a ticket for an event |

**Example: List Events**

```bash
curl http://localhost:6001/api/events
```

**Example: Purchase Ticket**

```bash
curl -X POST http://localhost:6001/api/events/1/purchase
```

### Admin Service (`http://localhost:6000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Create a new event |
| `PUT` | `/api/events/:id` | Update an event |
| `DELETE` | `/api/events/:id` | Delete an event |

**Example: Create Event**

```bash
curl -X POST http://localhost:6000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Tech Conference 2025",
    "date":"2025-12-15",
    "ticketsAvailable":100
  }'
```

### LLM Service (`http://localhost:6002`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a message to the AI booking assistant |

## Environment Variables

### Frontend Setup

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
touch .env
```

Add the following variables:

```env
# Frontend Environment Variables
REACT_APP_AUTH_BASE=http://localhost:6010
REACT_APP_ADMIN_BASE=http://localhost:6000
REACT_APP_CLIENT_BASE=http://localhost:6001
REACT_APP_LLM_BASE=http://localhost:6002

# Optional: LLM API Configuration
REACT_APP_LLM_API_KEY=your-openai-api-key
REACT_APP_ENABLE_VOICE=true
```

**Production (GitHub Pages Deployment):**
```env
REACT_APP_AUTH_BASE=https://your-api-domain.com
REACT_APP_ADMIN_BASE=https://your-api-domain.com
REACT_APP_CLIENT_BASE=https://your-api-domain.com
REACT_APP_LLM_BASE=https://your-api-domain.com
```

### Backend Setup

Create `.env` files in each backend service directory:

#### Backend Root (`.env`)

```env
NODE_ENV=development
DB_PATH=./tigertix.sqlite
```

#### Auth Service (`.env` in `backend/user-authentication/`)

```env
PORT=6010
JWT_SECRET=your-super-secret-key-change-in-production
FRONTEND_ORIGIN=http://localhost:3000
DB_PATH=../shared-db/tigertix.sqlite
```

#### Admin Service (`.env` in `backend/admin-service/`)

```env
PORT=6000
DB_PATH=../shared-db/tigertix.sqlite
JWT_SECRET=your-super-secret-key-change-in-production
FRONTEND_ORIGIN=http://localhost:3000
```

#### Client Service (`.env` in `backend/client-service/`)

```env
PORT=6001
DB_PATH=../shared-db/tigertix.sqlite
JWT_SECRET=your-super-secret-key-change-in-production
```

#### LLM Service (`.env` in `backend/llm-driven-booking/`)

```env
PORT=6002
LLM_API_KEY=your-openai-api-key
LLM_MODEL=gpt-3.5-turbo
FRONTEND_ORIGIN=http://localhost:3000
```

**⚠️ Security Notice:** Never commit `.env` files to Git. Add them to `.gitignore`:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

## Troubleshooting

### Port Already in Use

If a port is already in use, kill the process or change the port:

```bash
# macOS/Linux: Find process on port 3000
lsof -i :3000
kill -9 <PID>

# Or change port when starting
PORT=3001 npm start
```

### React Scripts Command Not Found

```bash
cd frontend
npm install
npm start
```

### Database Lock Error

If you see SQLite lock errors, ensure only one instance of the backend is running:

```bash
# Kill all Node processes and restart
killall node
npm start
```

### CORS Errors

Ensure all services are running and CORS is properly configured. Check that:
- Frontend is on `http://localhost:3000`
- Auth service is on `http://localhost:6010` (configured in `FRONTEND_ORIGIN`)
- Requests use `credentials: 'include'` for cookie-based auth

## Features

✅ **User Authentication** — Secure JWT-based login/register with HTTP-only cookies
✅ **Event Management** — Create, read, update, delete events via admin service
✅ **Ticket Purchasing** — Real-time inventory management and purchase tracking
✅ **LLM-Driven Booking** — AI assistant to help users find and book events
✅ **Voice Support** — Speak to the AI booking assistant
✅ **Automated Testing** — Jest (backend) and React Testing Library (frontend)
✅ **CI/CD Pipeline** — GitHub Actions for automated testing and deployment
✅ **Responsive Design** — Works on desktop and mobile

## Development Tips

- Use **VS Code** for best developer experience
- Install the **ES7+ React/Redux/React-Native snippets** extension
- Run `npm test -- --watch` in frontend for live test reloading
- Check console and network tabs in browser DevTools for debugging

## Team & Credits

### Project Team

**TigerGPT Semester Project — Clemson University (CPSC 3720)**

#### Team Members
- **Christian Dew** — Project Lead, Microservices Architecture, Backend Development
- **Arun Singh** — Authentication System, Frontend Integration, Deployment

#### Course Instructors & Teaching Assistants
- **Instructor:** [Course Instructor Name] (CPSC 3720)
- **Teaching Assistants:** [TA Names] (Office Hours & Support)

#### Project Roles

| Role | Responsibility |
|------|----------------|
| **Frontend Lead** | React UI, components, testing, accessibility |
| **Backend Lead** | Microservices, API design, database schema |
| **DevOps Lead** | CI/CD pipeline, deployment, infrastructure |
| **QA Lead** | Test coverage, regression testing, edge cases |
| **Product Owner** | Requirements, user stories, acceptance criteria |

#### Acknowledgments

- Clemson University Computer Science Department
- TigerGPT initiative for AI-driven education
- Open-source community (React, Express, Node.js, etc.)

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request
5. Ensure all tests pass before merging

---

## License

This project is licensed under the **MIT License** — See below for details.

### MIT License Summary

You are free to:
- ✅ Use this software for commercial or private purposes
- ✅ Modify the code to fit your needs
- ✅ Distribute copies of the software
- ✅ Use the software in derivatives

Under the conditions:
- ⚠️ Include a copy of the license and copyright notice
- ⚠️ State significant changes to the code

For the full license text, see [MIT License](https://choosealicense.com/licenses/mit/)

**Copyright © 2025 Clemson University — CPSC 3720**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
