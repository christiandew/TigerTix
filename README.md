# TigerTix

A microservice-based event ticketing system for Clemson Campus Events with user authentication, real-time availability, and LLM-driven booking assistance.

**TigerGPT Semester Project**

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Running Services Locally](#running-services-locally)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)

## Architecture

TigerTix is built as a microservices architecture:

- **Frontend**: React single-page application (port 3000)
- **User Authentication Service**: Express-based JWT auth (port 6010)
- **Admin Service**: Event management and creation (port 6000)
- **Client Service**: Event listing and ticket purchasing (port 6001)
- **LLM Service**: AI-powered booking assistance with voice (port 6002)
- **Database**: SQLite (shared across services)

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

## Testing

### Run All Tests

```bash
npm test
```

This runs:
- Backend integration tests (Jest)
- Frontend unit tests (React Testing Library)

### Run Backend Tests Only

```bash
cd backend
npm test
```

### Run Frontend Tests Only

```bash
cd frontend
npm test
```

### Run Tests with Coverage

```bash
cd frontend
npm test -- --coverage --watchAll=false
```

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

### Frontend (`.env`)

```env
REACT_APP_AUTH_BASE=http://localhost:6010
REACT_APP_ADMIN_BASE=http://localhost:6000
REACT_APP_CLIENT_BASE=http://localhost:6001
REACT_APP_LLM_BASE=http://localhost:6002
```

### Backend (`.env` in respective service directories)

```env
PORT=6000
DB_PATH=./tigertix.sqlite
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_ORIGIN=http://localhost:3000
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

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

This project is part of the Clemson University course (CPSC 3720).
