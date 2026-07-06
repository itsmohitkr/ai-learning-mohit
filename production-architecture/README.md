# Production Project Architecture

Companion code for the Notion module **"Production Project Architecture"** (under System Design).

Goal: learn how real software projects are structured in startups and large tech orgs, and how a project *evolves* as it grows — using one continuous running example (a booking platform) instead of disconnected toy apps.

## Running example

Every lesson evolves the same codebase, culminating in `booking-platform/`:

```
Stage 1        Stage 2              Stage 3
frontend/  ->  frontend/       ->   apps/
backend/       backend/             web, admin, api, worker
               mobile/              packages/
                                    ui, database, auth, validation, logger, config, shared-types, utils
```

## Lessons

| # | Lesson | Folder |
|---|--------|--------|
| 1 | Evolution of a Production Project | `lesson-01-evolution/` |
| 2 | Monorepo Fundamentals | `lesson-02-monorepo-fundamentals/` |
| 3 | Production Folder Structure | `lesson-03-folder-structure/` |
| 4 | Turborepo | `lesson-04-turborepo/` |
| 5 | Building Your First Monorepo | `lesson-05-first-monorepo/` |
| 6 | Sharing Code | `lesson-06-sharing-code/` |
| 7 | Modular Backend Architecture | `lesson-07-modular-backend/` |
| 8 | Background Workers | `lesson-08-background-workers/` |
| 9 | RBAC and Permissions | `lesson-09-rbac/` |
| 10 | Microservices | `lesson-10-microservices/` |
| 11 | Communication Between Services | `lesson-11-service-communication/` |
| 12 | Deploying Production Applications | `lesson-12-deployment/` |
| 13 | Folder Structure of a Large Production Repo | `lesson-13-large-repo-structure/` |
| 14 | Capstone: Designing a Production Booking Platform | `booking-platform/` (final state) |

Each `lesson-NN-*` folder is a **snapshot/diff** of the repo at that stage where relevant (some early lessons are conceptual only — diagrams/notes, no code). `booking-platform/` holds the live, continuously-evolved monorepo starting from Lesson 5 onward.

## Open decisions

- [ ] pnpm workspaces recommended as the monorepo package manager
- [ ] JS vs TS for this module (AI lessons use plain JS for readability — decide if that carries over, or if this is the module to introduce TS)
