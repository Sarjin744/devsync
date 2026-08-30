# DevSync — Full-Stack Team Collaboration Platform

> A production-quality full-stack portfolio project demonstrating modern web and mobile development practices.

![DevSync](https://img.shields.io/badge/Stack-TypeScript-blue) ![React Native](https://img.shields.io/badge/Mobile-React%20Native-61dafb) ![Next.js](https://img.shields.io/badge/Web-Next.js-black) ![Node.js](https://img.shields.io/badge/Backend-Node.js-green) ![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-blue)

---

## 📋 Overview

DevSync is a modern team collaboration platform for software development teams. It allows users to manage projects, tasks, teams, real-time communication, notifications, files, and project activity from a single platform.

**Live Demo:**
- 🌐 Web: [https://devsync-web.onrender.com](https://devsync-web.onrender.com)
- 🔌 API: [https://devsync-api.onrender.com](https://devsync-api.onrender.com)
- 📚 API Docs: [https://devsync-api.onrender.com/api/docs](https://devsync-api.onrender.com/api/docs)

---

## ✨ Features

- **🔐 Authentication** — JWT access/refresh tokens, secure password hashing (bcrypt), protected routes
- **👤 User Management** — Profiles, avatars, online/offline presence
- **🏢 Teams** — Create teams, invite members, role management
- **📁 Projects** — Full project lifecycle, member management, role-based access control
- **🗂️ Kanban Board** — Drag-and-drop task management (TODO → IN PROGRESS → IN REVIEW → DONE)
- **💬 Real-Time Chat** — Socket.IO-powered project chat with typing indicators
- **🔔 Notifications** — Real-time push notifications for assignments, comments, mentions
- **📎 File Sharing** — Upload and share files within projects
- **📊 Activity Feed** — Chronological project activity tracking
- **🔍 Search** — Backend-powered search across projects, tasks, and users
- **📱 Mobile App** — React Native/Expo mobile application
- **🌐 Web Dashboard** — Next.js professional web interface
- **📖 API Documentation** — Swagger/OpenAPI docs

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native, Expo, TypeScript, React Navigation |
| **Web** | Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query |
| **Backend** | Node.js, Express.js, TypeScript, Socket.IO |
| **Database** | PostgreSQL, Prisma ORM |
| **Auth** | JWT (access + refresh tokens), bcryptjs |
| **Validation** | Zod |
| **API Docs** | Swagger/OpenAPI |
| **Hosting** | Render (backend + web), Expo Go (mobile) |

---

## 🏗 Architecture

```
devsync/
│
├── apps/
│   ├── mobile/          # React Native + Expo
│   └── web/             # Next.js 14 + Tailwind CSS
│
├── server/              # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── services/    # Business logic
│   │   ├── routes/      # Express routers
│   │   ├── middleware/  # Auth, validation, error handling
│   │   ├── validators/  # Zod schemas
│   │   ├── sockets/     # Socket.IO handlers
│   │   ├── utils/       # Helpers
│   │   └── config/      # App configuration
│   └── prisma/
│       └── schema.prisma
│
├── packages/
│   └── shared/          # Shared TypeScript types
│
├── docs/
├── .gitignore
├── .env.example
└── README.md
```

### Data Flow

```
Client (Web/Mobile)
        │
        ▼ REST API / WebSocket
    Express + Socket.IO
        │
        ├─── Controllers (thin)
        │         │
        │         ▼
        ├─── Services (business logic)
        │         │
        │         ▼
        └─── Prisma ORM
                  │
                  ▼
            PostgreSQL
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL (running locally or remote URL)
- npm or pnpm

### 1. Clone the repository

```bash
git clone https://github.com/your-username/devsync.git
cd devsync
```

### 2. Install dependencies

```bash
# Server
cd server && npm install

# Web
cd ../apps/web && npm install

# Mobile
cd ../mobile && npm install
```

### 3. Configure environment

```bash
# Copy example files
cp .env.example server/.env
cp apps/web/.env.local.example apps/web/.env.local  # optional
```

Edit `server/.env` with your values:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/devsync
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

### 4. Set up database

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run the applications

```bash
# Start the backend (terminal 1)
cd server
npm run dev

# Start the web app (terminal 2)
cd apps/web
npm run dev

# Start the mobile app (terminal 3)
cd apps/mobile
npm start
```

---

## 🔑 Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret |
| `JWT_ACCESS_EXPIRY` | | Access token expiry (default: `15m`) |
| `JWT_REFRESH_EXPIRY` | | Refresh token expiry (default: `7d`) |
| `PORT` | | Server port (default: `5000`) |
| `CLIENT_URL` | | CORS allowed origins |
| `STORAGE_PROVIDER` | | `local` or `cloudinary` |
| `CLOUDINARY_*` | | Cloudinary credentials (production) |

### Web (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL |

### Mobile (`apps/mobile/.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API URL |

---

## 🗄 Database Setup & Prisma ORM

DevSync uses **PostgreSQL** with **Prisma ORM** for type-safe relational data persistence.

### 1. Database Provisioning & Connection

1. Install PostgreSQL locally (or use a hosted PostgreSQL service such as Render PostgreSQL, Supabase, Neon, or Railway).
2. Create an empty database named `devsync`.
3. Configure the `DATABASE_URL` in `server/.env`:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/devsync"
   ```

### 2. Migrations & Client Generation

```bash
cd server

# Apply migrations
npx prisma migrate deploy

# (Optional) Generate fresh TypeScript client
npx prisma generate
```

### 3. Database Seed

Populate the database with safe development mock data (teams, projects, members, tasks, comments, activity, and messages):

```bash
cd server
npm run db:seed
```

#### Safe Development Credentials (Fake / Mock Data)

| Role | Email | Password |
|------|-------|----------|
| **Project Owner** | `alex.dev@devsync.local` | `Password123!` |
| **Team Lead** | `sarah.lead@devsync.local` | `Password123!` |
| **Developer** | `marcus.eng@devsync.local` | `Password123!` |

*(Note: Passwords in seed are securely hashed with bcrypt. Never use real passwords in development seed data.)*

### 4. Database Models

- **User**: Name, email (`@unique`), passwordHash, profileImage, bio, isOnline, timestamps.
- **Team**: Name, description, owner (`User`), members (`TeamMember`), projects.
- **TeamMember**: `teamId`, `userId`, role (`OWNER` \| `MEMBER`), `@@unique([teamId, userId])`.
- **Project**: Name, description, status (`ACTIVE` \| `ARCHIVED`), owner, team, members, tasks, messages, files, activity.
- **ProjectMember**: `projectId`, `userId`, role (`OWNER` \| `TEAM_LEAD` \| `DEVELOPER` \| `VIEWER`), `@@unique([projectId, userId])`.
- **Task**: Title, description, status (`TODO` \| `IN_PROGRESS` \| `IN_REVIEW` \| `DONE`), priority (`LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL`), assignee, creator, comments, dueDate.
- **TaskComment**: Task reference, author reference, content, timestamps.
- **Message**: Project chat messages with sender reference and timestamps.
- **Notification**: User targeted notifications with type, title, message, read state.
- **File**: File metadata records (fileName, fileUrl, mimeType, fileSize, uploader).
- **Activity**: Chronological project action audit logs (action, description, user, project).
- **RefreshToken**: Token hash, user reference, expiresAt, revokedAt for auth rotation.

### 5. Prisma Studio

Inspect and manage your database visually:

```bash
cd server
npm run db:studio
```

---

## 🔐 Authentication & Security Architecture

DevSync implements a multi-tier stateless JWT authentication pipeline backed by PostgreSQL and Prisma:

```
Client (Web / Mobile)
       │
       ├─── 1. POST /api/auth/login (email + password)
       │         │
       │         ▼
       │    Bcrypt Password Verification
       │         │
       │         ▼
       │    Generate Access Token (15m) + Refresh Token (7d)
       │    Store SHA-256 Hashed Refresh Token in PostgreSQL
       │         │
       │         ▼
       │    Returns { user, accessToken, refreshToken }
       │
       ├─── 2. Protected Request with Authorization: Bearer <accessToken>
       │         │
       │         ▼
       │    `authenticate` Middleware verifies JWT signature & expiry
       │
       └─── 3. On 401 Expiry -> POST /api/auth/refresh (refreshToken)
                 │
                 ▼
            Rotate Token: Revoke old token & issue new token pair
```

### Key Security Mechanisms

1. **Password Protection**: Passwords are never stored in plaintext. They are salted and hashed using **bcrypt (12 rounds)** before storage.
2. **Access Token Lifespan**: Signed JWTs with short expiry (`JWT_ACCESS_EXPIRES_IN=15m`) carrying minimal claims (`userId`, `email`).
3. **Refresh Token Rotation**: Refresh tokens are rotated on each `/api/auth/refresh` call. Replay attacks are mitigated by invalidating previous tokens.
4. **Hashed Database Storage**: Only **SHA-256 hashes** of refresh tokens are stored in the `RefreshToken` table.
5. **Idempotent Session Revocation**: `/api/auth/logout` deletes active refresh token hashes and clears offline presence.
6. **No Information Leakage**: Login endpoint returns generic `"Invalid email or password"` errors to prevent user enumeration attacks.
7. **Rate Limiting**: Brute-force protection on `/api/auth/` routes limiting login/register attempts per IP window.
8. **RBAC Foundation**: `authorize.ts` middleware provides role hierarchy verification (`OWNER` > `TEAM_LEAD` > `DEVELOPER` > `VIEWER`).

### Authentication Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account with hashed password |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials & issue token pair |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token & issue new access token |
| `POST` | `/api/auth/logout` | Optional Auth | Revoke refresh token & close session |
| `GET` | `/api/auth/me` | Bearer Auth | Fetch authenticated user profile |
| `PUT` | `/api/auth/change-password` | Bearer Auth | Verify current password and update to new bcrypt hash |

---

## 🧪 Testing Suite

Run the full automated test suite using Jest:

```bash
cd server
npm test
```

### Test Coverage (32 Passed Tests)

- **JWT Utilities (`jwt.test.ts`)**: Access token generation, claims validation, refresh token creation, token tampering rejection, and SHA-256 hash determinism.
- **Password Utilities (`password.test.ts`)**: Bcrypt salt hashing, positive match verification, and negative mismatch rejection.
- **Validation Schemas (`validation.test.ts`)**: Zod schema validation for register (name, email, password strength), login, and refresh tokens.
- **Authentication Flows (`auth.test.ts`)**:
  - `POST /api/auth/register` (success, duplicate 409, invalid email 400, weak password 400, missing fields 400)
  - `POST /api/auth/login` (success, incorrect password 401, unknown user 401)
  - `GET /api/auth/me` (valid token 200, missing token 401, malformed token 401, passwordHash exclusion)
  - `POST /api/auth/refresh` (token rotation 200, revoked token replay rejection 401, expired token 401)
  - `POST /api/auth/logout` (session revocation, idempotency)

---

## 🚢 Deployment (Render)

### Backend

1. Create a **Web Service** on Render
2. Set build command: `cd server && npm install && npx prisma generate && npm run build`
3. Set start command: `cd server && npx prisma migrate deploy && node dist/server/src/index.js`
4. Set environment variables from `.env.example`

### Web

1. Create a **Static Site** or **Web Service** on Render
2. Set build command: `cd apps/web && npm install && npm run build`
3. Set start command: `npm start`
4. Set `NEXT_PUBLIC_API_URL` to your backend Render URL

---

## 🔮 Future Improvements

- [ ] Email verification and password reset
- [ ] GitHub integration (link PRs to tasks)
- [ ] Kanban drag-and-drop (DnD kit)
- [ ] Mentions and @notifications
- [ ] Dark mode
- [ ] Export to PDF/CSV
- [ ] Gantt chart view
- [ ] Calendar integration
- [ ] Mobile push notifications (Expo Notifications)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ as a full-stack portfolio project demonstrating TypeScript, React Native, Next.js, Node.js, PostgreSQL, WebSockets, and REST API best practices.
