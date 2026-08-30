# DevSync Architecture & Specification

## Monorepo Layout

```text
devsync/
│
├── apps/
│   ├── mobile/         # React Native + Expo (TypeScript)
│   └── web/            # Next.js (TypeScript + Tailwind CSS)
│
├── server/             # Node.js + Express + Socket.IO (TypeScript)
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── sockets/
│   │   ├── utils/
│   │   └── config/
│   │
│   └── prisma/
│       └── schema.prisma
│
├── packages/
│   └── shared/         # Shared TypeScript interfaces and types
│
├── docs/               # Project documentation
├── README.md
├── .gitignore
└── .env.example
```

## System Components

1. **Mobile App**: Cross-platform mobile client for iOS and Android via Expo.
2. **Web App**: Responsive SaaS web dashboard using Next.js App Router and Tailwind CSS.
3. **Backend Service**: Layered Express REST API with Socket.IO real-time event pipeline.
4. **Database Layer**: PostgreSQL managed via Prisma ORM schemas and migrations.
5. **Shared Layer**: Shared domain contracts ensuring type synchronization across clients and server.
