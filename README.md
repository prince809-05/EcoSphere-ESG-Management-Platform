# EcoSphere AI - ESG Management Platform

EcoSphere AI is a full-stack ESG management dashboard for tracking Environmental, Social, and Governance performance across departments. It combines carbon accounting, CSR participation, gamification, governance audits, feedback, reports, and an ESG-aware chatbot into one role-based platform.

## Features

- **Dashboard Overview**: company-wide ESG scores, department rankings, emission trends, charts, live activity, and admin score configuration.
- **Environmental Module**: carbon transaction logs, emission factor management, environmental goals, and AI-powered improvement context.
- **Social Module**: CSR activities, employee participation, proof submission, manager/admin review, and social engagement tracking.
- **Governance Module**: ESG policies, acknowledgements, audit scheduling, compliance issue assignment, and resolution workflow.
- **Gamification Module**: sustainability challenges, XP, badges, rewards, leaderboard, and challenge review.
- **Reports Module**: generate and export ESG reports as CSV, XLSX, and PDF.
- **Feedback Module**: users can submit feedback; admins can review, respond, resolve, and reopen items. Positive general/feature feedback is public-facing.
- **EcoSphere AI Chatbot**: answers ESG questions using site data for social participation, governance issues, environmental scores, policies, audits, CSR activities, and carbon logs.
- **Theme Support**: light/dark mode toggle in the dashboard header.

## Tech Stack

- **Framework**: Next.js 16.2.10 with App Router and Turbopack
- **Frontend**: React 19, Tailwind CSS, shadcn/ui, lucide-react, Framer Motion
- **Backend**: Next.js Server Actions and Route Handlers
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT session cookies with role-based access control
- **Charts**: Recharts
- **Exports**: jsPDF, xlsx, papaparse
- **AI Providers**: Gemini primary, Groq fallback, offline ESG fallback engine

## Roles

- **Admin**: full platform access, settings, departments, reports, governance actions, feedback review.
- **Manager**: department-level operational workflows and approvals.
- **Auditor**: audit and governance visibility/workflows.
- **Employee**: submit feedback, join CSR activities/challenges, acknowledge policies, view dashboards.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="your-secret-key"
GEMINI_API_KEY=""
GROQ_API_KEY=""
```

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Seed demo data:

```bash
npx tsx prisma/seed.ts
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Credentials

All seeded accounts use:

```text
password123
```

Useful demo users:

```text
Admin:    admin@ecosphere.com
Auditor:  auditor@ecosphere.com
Manager:  manager.mfg@ecosphere.com
Employee: emp1.mfg@ecosphere.com
```

## Useful Scripts

```bash
npm run dev      # Start local dev server
npm run build    # Build production app
npm run start    # Start production server
npm run lint     # Run ESLint
npx tsc --noEmit # Type-check the project
```

## Chatbot Demo Questions

For a quick project demo, ask:

```text
How do I improve social participation?
What governance issues need attention?
What is my environmental score?
```

## Project Structure

```text
app/          Next.js app routes, layouts, pages, API routes
actions/      Server actions for ESG modules
components/   Shared UI and dashboard components
lib/          Auth, Prisma, AI helpers, ESG score engine
prisma/       Prisma schema, migrations, and seed data
public/       Static assets and EcoSphere logo mark
types/        Shared TypeScript types
```

## Notes

- ESG score weights can be adjusted by admins from the dashboard/settings configuration.
- Recalculating score weights updates department score records through the ESG score engine.
- The chatbot uses live platform context where available and falls back to a deterministic ESG response engine if AI provider keys are missing.
