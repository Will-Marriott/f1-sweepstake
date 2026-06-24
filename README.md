# F1 Sweepstake

A web app for tracking an F1 sweepstake — allocate drivers to participants and track leaderboard progress throughout the season.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** SQLite via Prisma (with Better-SQLite3)
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest
- **Data Source:** [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) (CC BY-NC-SA 4.0)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Setup

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test

```bash
pnpm test
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | `file:./dev.db` | SQLite database path |
| `DISCORD_WEBHOOK_URL` | No | — | Discord webhook for notifications |

Copy `.env.example` to `.env` and configure as needed. All variables have sensible defaults or graceful fallbacks.

## Data Attribution

This project uses the [Jolpica F1 API](https://github.com/jolpica/jolpica-f1) for Formula 1 data. Jolpica data is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
