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

## 👥 Users, Teams & Role-Based Access Control (Stage 4)

### 1. User Profile Management & User Search
* **Profile Management**: Retrieve safe user profiles without sensitive secrets via `GET /api/users/me` and update metadata (`name`, `bio`, `profileImage`) via `PATCH /api/users/me`.
* **Password Change**: Dedicated `PATCH /api/users/me/password` validating current password against stored bcrypt hash, verifying new password complexity, updating the hash, and revoking existing refresh token sessions.
* **User Search**: Paginated user search via `GET /api/users/search?q=` supporting case-insensitive lookup by name and email while excluding the searching user and omitting private auth fields.

### 2. Team Management & Membership
* **Ownership Lifecycle**: Teams are created via `POST /api/teams` where the creator is automatically assigned as the `OWNER`.
* **Access Control**: Only team members can view team details (`GET /api/teams/:teamId`) and member rosters (`GET /api/teams/:teamId/members`). Non-members receive `403 Forbidden`.
* **Owner Privileges**: Only the team `OWNER` can edit team details (`PATCH /api/teams/:teamId`), delete the team (`DELETE /api/teams/:teamId`), change member roles (`PATCH /api/teams/:teamId/members/:userId`), or remove members (`DELETE /api/teams/:teamId/members/:userId`).

### 3. Team Invitations Pipeline
* **Invitation Dispatch**: Team owners invite users by email or userId via `POST /api/teams/:teamId/invitations`. The system prevents self-invitation, duplicate pending invitations, or inviting existing members.
* **Transactional Acceptance**: Invitee views pending invites via `GET /api/invitations`, and accepts via `POST /api/invitations/:id/accept` (which transactionally adds the user to `TeamMember` and marks the invitation `ACCEPTED`) or rejects via `POST /api/invitations/:id/reject`.

### User & Team Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | Bearer Auth | Get authenticated user profile |
| `PATCH` | `/api/users/me` | Bearer Auth | Update user profile (name, bio, profileImage) |
| `PATCH` | `/api/users/me/password` | Bearer Auth | Change password & revoke existing sessions |
| `GET` | `/api/users/search?q=` | Bearer Auth | Paginated user search by name or email |
| `POST` | `/api/teams` | Bearer Auth | Create team (creator becomes OWNER) |
| `GET` | `/api/teams` | Bearer Auth | List teams where user is a member |
| `GET` | `/api/teams/:teamId` | Team Member | Get team details and member list |
| `PATCH` | `/api/teams/:teamId` | Team Owner | Update team name and description |
| `DELETE` | `/api/teams/:teamId` | Team Owner | Delete team and cascade memberships |
| `GET` | `/api/teams/:teamId/members` | Team Member | List team members with roles |
| `PATCH` | `/api/teams/:teamId/members/:userId` | Team Owner | Update member role (`OWNER`, `MEMBER`) |
| `DELETE` | `/api/teams/:teamId/members/:userId` | Owner / Self | Remove member from team or leave team |
| `POST` | `/api/teams/:teamId/invitations` | Team Owner | Send team invitation |
| `GET` | `/api/invitations` | Bearer Auth | List user's pending invitations |
| `POST` | `/api/invitations/:id/accept` | Invitee | Accept team invitation & join team |
| `POST` | `/api/invitations/:id/reject` | Invitee | Reject team invitation |

---

## 📁 Project Management (Stage 5)

### 1. Project Lifecycle & Ownership
* **Project Creation**: Projects are created via `POST /api/projects`. If a `teamId` is specified, the user must be a member of the parent team. The creator is transactionally assigned as the project `OWNER` in `ProjectMember`.
* **Project Listing & Filtering**: `GET /api/projects` returns projects accessible to the authenticated user with support for filtering by `status` (`ACTIVE`, `ARCHIVED`) and `teamId`.
* **Project Details**: `GET /api/projects/:projectId` provides deep project metadata, owner details, member counts, and full member rosters with roles. Non-members receive `403 Forbidden`.
* **Lifecycle Transitions**:
  * `PATCH /api/projects/:projectId`: Allows project `OWNER` or `TEAM_LEAD` to modify project name and description.
  * `POST /api/projects/:projectId/archive`: Marks project as `ARCHIVED` (retains read-only access for authorized members).
  * `POST /api/projects/:projectId/restore`: Restores archived project to `ACTIVE` (OWNER only).
  * `DELETE /api/projects/:projectId`: Permanently deletes project and cascades project memberships safely without deleting users or teams (OWNER only).
  * `POST /api/projects/:projectId/leave`: Allows members to leave a project. The `OWNER` cannot leave without transferring ownership first.

### 2. Project Member Roles & Permissions
* **`OWNER`**: Full project control, modify settings, assign/change member roles, archive, restore, delete project.
* **`TEAM_LEAD`**: Update project details, manage members, archive project.
* **`DEVELOPER`**: View project, participate in future tasks, comment, and chat.
* **`VIEWER`**: Read-only access to permitted project information.

### 3. Parent Team Enforcement
When adding members to a project via `POST /api/projects/:projectId/members`, the user being added must already belong to the project's parent `Team`. Duplicate memberships are prevented with `409 Conflict`.

### Project Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/projects` | Team Member | Create project under team (creator becomes `OWNER`) |
| `GET` | `/api/projects` | Bearer Auth | List user's projects with `status` & `teamId` filters |
| `GET` | `/api/projects/:projectId` | Project Member | Get project details, owner, team, and member list |
| `PATCH` | `/api/projects/:projectId` | Owner / Lead | Update project name and description |
| `POST` | `/api/projects/:projectId/archive` | Owner / Lead | Archive project |
| `POST` | `/api/projects/:projectId/restore` | Project Owner | Restore project to active |
| `DELETE` | `/api/projects/:projectId` | Project Owner | Delete project permanently |
| `POST` | `/api/projects/:projectId/leave` | Member (Non-Owner) | Leave project |
| `GET` | `/api/projects/:projectId/members` | Project Member | List all project members with roles |
| `POST` | `/api/projects/:projectId/members` | Owner / Lead | Add member from parent team to project |
| `PATCH` | `/api/projects/:projectId/members/:userId` | Project Owner | Update member role (`OWNER`, `TEAM_LEAD`, `DEVELOPER`, `VIEWER`) |
| `DELETE` | `/api/projects/:projectId/members/:userId` | Owner / Lead | Remove member from project |

---

## 📋 Task Management & Kanban Board (Stage 6)

### 1. Task Lifecycle & Kanban Workflow
* **Kanban Statuses**: `TODO` $\to$ `IN_PROGRESS` $\to$ `IN_REVIEW` $\to$ `DONE`.
* **Priorities**: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
* **Due Date Tracking**: Timezone-safe due dates with dynamic overdue calculations (`dueDate < now` and `status != DONE`).
* **Optimistic Drag-and-Drop**: Web Kanban board supports smooth column shifts with instant optimistic updates and automatic state rollback upon API errors.

### 2. Task Permissions & Assignment
* **Task Creation**: Only project members with `OWNER`, `TEAM_LEAD`, or `DEVELOPER` roles can create tasks.
* **Assignee Enforcement**: Task assignees must belong to the active project membership roster.
* **Update Permissions**: `OWNER` and `TEAM_LEAD` have full task editing permissions. Assigned `DEVELOPER` or task creator can update status, priority, and descriptions.
* **Deletion**: Only `OWNER`, `TEAM_LEAD`, or task creator can permanently delete tasks.

### 3. Server-Side Filtering & Pagination
`GET /api/projects/:projectId/tasks` supports database-side filtering (`status`, `priority`, `assigneeId`) and pagination (`page`, `limit`), returning standardized pagination metadata (`total`, `totalPages`, `page`, `limit`).

### Task Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/projects/:projectId/tasks` | Project Member | Create new task in project |
| `GET` | `/api/projects/:projectId/tasks` | Project Member | List project tasks with filters & pagination |
| `GET` | `/api/tasks/:taskId` | Project Member | Get task details, creator, and assignee |
| `PATCH` | `/api/tasks/:taskId` | Permitted User | Update task title, description, priority, assignee, due date |
| `PATCH` | `/api/tasks/:taskId/status` | Permitted User | Shift task status (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) |
| `DELETE` | `/api/tasks/:taskId` | Owner/Lead/Creator | Delete task permanently |
| `GET` | `/api/tasks/my` | Bearer Auth | List all tasks assigned to authenticated user |

---

## 💬 Real-Time Project Chat & Socket.IO (Stage 7)

### 1. Socket.IO Architecture & Flow

```text
React / React Native App
       ↓ (JWT Handshake: auth: { token })
Socket.IO Connection Middleware (Authentication & User Context)
       ↓
Project Room Isolation (project:projectId)
       ↓
Message Verification & Rate Limiting (Max 15 msg/5s)
       ↓
Prisma ORM & PostgreSQL Persistence
       ↓
Broadcast to Project Room (message:new)
```

### 2. Socket.IO Events

| Direction | Event | Payload | Description |
|---|---|---|---|
| Client $\to$ Server | `project:join` | `{ projectId }` | Verifies project membership and joins room |
| Server $\to$ Client | `project:joined` | `{ projectId }` | Confirms room join |
| Client $\to$ Server | `project:leave` | `{ projectId }` | Leaves project room |
| Client $\to$ Server | `message:send` | `{ projectId, content }` | Validates, persists to DB, and broadcasts |
| Server $\to$ Client | `message:new` | Message Object with Sender | Real-time message broadcast to room |
| Client $\to$ Server | `typing:start` | `{ projectId }` | Broadcasts typing state to room members |
| Client $\to$ Server | `typing:stop` | `{ projectId }` | Stops typing state |
| Server $\to$ Client | `typing:update` | `{ projectId, userId, isTyping }` | Live typing indicator update |
| Server $\to$ Client | `presence:sync` | `{ projectId, onlineUserIds }` | Online members list for project |
| Server $\to$ Client | `presence:online` / `presence:offline` | `{ projectId, userId }` | Member presence transitions |

### 3. REST Message Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/projects/:projectId/messages` | Project Member | Get paginated message history |
| `DELETE` | `/api/messages/:messageId` | Sender / Owner | Delete message |

---

## 🔔 Notifications & Project Activity Feed (Stage 8)

### 1. Notification Architecture & Flow

```text
Action Trigger (Task Assigned, Status Shifted, Member Added)
       ↓
Notification Service (Preference Filter & Deduplication)
       ↓
PostgreSQL Persistence (Prisma Notification Model)
       ↓
Socket.IO Delivery to Private User Room (user:userId)
       ↓
Client Receives (notification:new & unread count badge update)
```

### 2. Notification Types & Socket Events

| Notification Type | Trigger Event | Target Recipient |
|---|---|---|
| `TASK_ASSIGNED` | Task assignee changed/assigned | Assigned User |
| `TASK_STATUS_CHANGED` | Task moved across workflow columns | Task Creator & Assignee |
| `TASK_DUE_SOON` | Task due date within reminder window | Assignee |
| `TASK_OVERDUE` | Task past due date & incomplete | Assignee |
| `PROJECT_MEMBER_ADDED` | Member invited/added to project | Target User |
| `PROJECT_MEMBER_REMOVED`| Member removed from project | Target User |
| `PROJECT_ROLE_CHANGED` | Member role updated | Target User |

### 3. REST Notification & Activity Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Bearer Auth | List user notifications with pagination & `isRead` filter |
| `GET` | `/api/notifications/unread-count` | Bearer Auth | Get total unread notifications count |
| `PATCH` | `/api/notifications/:id/read` | Notification Owner | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | Bearer Auth | Mark all user notifications as read |
| `DELETE` | `/api/notifications/:id` | Notification Owner | Delete notification |
| `GET` | `/api/notification-preferences` | Bearer Auth | Get user notification delivery preferences |
| `PATCH` | `/api/notification-preferences` | Bearer Auth | Update user notification preferences |
| `GET` | `/api/projects/:projectId/activity` | Project Member | List paginated project activity with action filters |

---

## 📎 Project File Management & Cloud Storage (Stage 9)

### 1. Storage Architecture & Flow

```text
React / React Native File Picker
       ↓ Multipart Form-Data (POST /api/projects/:projectId/files)
Node.js API (Express + Multer in Memory Buffer)
       ↓ Authorization (requireProjectMember)
Cloud Storage (S3 / Cloudflare R2 / MinIO / Local Fallback via IStorageProvider)
       ↓ Safe Storage Key (projects/{projectId}/{uuid}-{safeFileName})
PostgreSQL Metadata (Prisma File Model with Cascade Delete)
       ↓ Activity Timeline & Real-Time Sync
Socket.IO Broadcast (`file:new`, `file:updated`, `file:deleted` to `project:{id}`)
```

* **Cloud Storage Abstraction (`IStorageProvider`)**: Decoupled interface supporting Cloudflare R2, AWS S3, and local fallback without hardcoded vendor locks.
* **Stateless & Restart-Safe**: Files are never stored permanently on the server filesystem, ensuring 100% compatibility with stateless hosting platforms (Render, Railway, Fly.io).
* **Compensating Transactions**: If database insertion fails after a successful storage upload, the service automatically deletes the orphaned object from cloud storage.
* **Presigned Download URLs**: Short-lived signed URLs with `Content-Disposition` attachments ensure storage credentials are never exposed to clients.

### 2. REST File Management Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/projects/:projectId/files` | Project Member | Upload project attachment (max 25MB) |
| `GET` | `/api/projects/:projectId/files` | Project Member | List all project files with search, sorting (`newest`, `oldest`, `name`, `size`), and pagination |
| `GET` | `/api/files/:fileId` | Project Member | Get single file details and metadata |
| `GET` | `/api/files/:fileId/download` | Project Member | Secure download via short-lived signed URL or proxy stream |
| `PATCH` | `/api/files/:fileId` | Uploader / Owner / Lead | Rename file with path-traversal protection |
| `DELETE` | `/api/files/:fileId` | Uploader / Owner / Lead | Delete file from cloud storage and remove database metadata |

### 3. Real-Time Socket.IO File Events

| Direction | Event | Payload | Scope |
|---|---|---|---|
| Server $\to$ Client | `file:new` | `ProjectFile` | `project:${projectId}` |
| Server $\to$ Client | `file:updated` | `ProjectFile` | `project:${projectId}` |
| Server $\to$ Client | `file:deleted` | `{ fileId, projectId }` | `project:${projectId}` |

---

## 🔍 Global Search & Advanced Discovery (Stage 10)

### 1. Search Architecture & Scope

```text
Client (Web Command Palette / Mobile Search Screen)
       ↓ Debounced GET /api/search?q=...&type=...&projectId=...
Authentication & Rate Limiting (60 requests/min)
       ↓ Authorization Engine (Resolves user's accessible Project & Team IDs)
PostgreSQL Query Concurrency (Projects, Tasks, Messages, Files, Activity, Teammates)
       ↓ Relevance Scoring (Exact Match > Prefix Match > Content Match > Recency)
Paginated Standard JSON Response
```

* **Authorized Multi-Entity Search**: Indexes and retrieves matching `PROJECT`, `TASK`, `USER`, `MESSAGE`, `FILE`, and `ACTIVITY` items without exposing cross-project data.
* **Strict Server-Side Isolation**: Outsiders never discover projects, tasks, messages, files, or activities outside their explicit memberships.
* **User Privacy Enforcement**: Only returns users who share at least one active team or project with the requesting user.
* **Command Palette UX (`Ctrl + K` / `Cmd + K`)**: Modal command palette with debounced search, category pills, keyboard navigation (Arrow Up/Down, Enter, Esc), and local recent search history.
* **Mobile Discovery Screen**: Fast search screen with recent searches, type filters, and direct tab navigation.

### 2. REST Search Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/search?q=...&type=...&projectId=...` | Authenticated User | Unified multi-entity search with relevance scoring, filtering, and pagination |

---

## 🧪 Testing Suite

Run the full automated test suite using Jest:

```bash
cd server
npm test
```

### Test Coverage (148 Passed Tests)

- **JWT Utilities (`jwt.test.ts`)**: Access token generation, claims validation, refresh token creation, token tampering rejection, and SHA-256 hash determinism (5 tests).
- **Password Utilities (`password.test.ts`)**: Bcrypt salt hashing, positive match verification, and negative mismatch rejection (3 tests).
- **Validation Schemas (`validation.test.ts`)**: Zod schema validation for register (name, email, password strength), login, and refresh tokens (9 tests).
- **Authentication Flows (`auth.test.ts`)**: Registration, Login, Token Refresh, Session Revocation, and Logout (15 tests).
- **User Profile & Search (`user.test.ts`)**: Get profile, update profile, change password with session revocation, and paginated user search (9 tests).
- **Teams & Invitations (`team.test.ts`)**: Team CRUD, non-member 403 authorization, owner permissions, member role updates, invitation creation, duplicate invitation prevention, and transactional acceptance/rejection (15 tests).
- **Project Management (`project.test.ts`)**: Project creation, team membership validation, project listing, details, member 403 authorization, owner/lead updates, archive, restore, delete, member additions with parent team enforcement, duplicate prevention, role updates, member removal, and leave project safety (20 tests).
- **Task Management & Kanban (`task.test.ts`)**: Task creation with defaults, validation errors, assignee project membership enforcement, paginated listings with status/priority filters, single task details, role-based updates, status transitions, authorized deletions, and user assigned tasks (17 tests).
- **Real-Time Chat & Socket.IO (`chat.test.ts`)**: REST message history, 403 outsider rejection, message deletion, Socket JWT authentication, project room joining, 403 non-member room join rejection, real-time message sending and persistence, empty and oversized validation, critical room isolation verification, and typing indicators (11 tests).
- **Notifications & Preferences (`notification.test.ts`)**: User notification preferences GET/PATCH, paginated notifications list, unread counts, mark read, mark all read, delete, user isolation (403), scheduled due-soon task checks, and overdue task checks with deduplication (9 tests).
- **Project Activity Feed (`activity.test.ts`)**: Activity feed pagination, filtering by action type, non-member 403 authorization, and structured event metadata (5 tests).
- **File Management & Cloud Storage (`file.test.ts`)**: Multipart file uploads, project membership validation, 400 empty validation, 403 outsider rejection, paginated file listings, single file details, short-lived signed download redirects, role-based file renaming (owner/lead/uploader vs viewer 403), role-based file deletion (storage cleanup + DB record deletion), and cross-project security isolation (16 tests).
- **Global Search & Discovery (`search.test.ts`)**: Input normalization, min/max length validation, query trimming, individual entity filters (`projects`, `tasks`, `messages`, `files`, `activity`, `users`), global multi-entity aggregation, project-specific search scoping, 403 outsider rejection on unauthorized projects, and mandatory cross-project data leakage prevention (14 tests).

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
