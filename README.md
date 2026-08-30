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

## 🗄 Database

DevSync uses PostgreSQL with Prisma ORM.

### Key models

- **User** — Authentication, profile, presence
- **Team / TeamMember** — Team management with roles
- **Project / ProjectMember** — Project with RBAC
- **Task** — Kanban tasks with priorities
- **Comment** — Task comments
- **Message** — Project chat
- **Notification** — Real-time notifications
- **Activity** — Project activity log
- **File** — File metadata
- **RefreshToken** — JWT refresh token storage

### Migrations

```bash
cd server
npx prisma migrate dev --name <migration-name>
npx prisma migrate deploy  # production
```

---

## 📡 API Reference

Full API documentation available at `/api/docs` (Swagger UI).

### Key endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login |
| `POST /api/auth/refresh` | Refresh access token |
| `GET /api/auth/me` | Current user |
| `GET /api/projects` | List user's projects |
| `POST /api/projects` | Create project |
| `GET /api/tasks?projectId=` | Get project tasks |
| `PATCH /api/tasks/:id/status` | Update task status |
| `GET /api/notifications` | List notifications |
| `GET /api/dashboard` | Dashboard stats |
| `GET /api/search?q=` | Search projects/tasks/users |

---

## 🧪 Testing

```bash
cd server
npm test
```

Tests cover:
- Authentication (register, login, JWT)
- Project creation and membership
- Task CRUD and status changes
- Comment creation
- Notification creation

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
