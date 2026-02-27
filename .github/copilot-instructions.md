# F1 Sweepstake - Copilot Instructions

## Project Overview

An F1 sweepstake tracker built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4. Uses pnpm as the package manager. This will be deployed using docker/docker compose on a raspberry pi 5.

**Purpose:** Track F1 sweepstake games - users, points, driver allocations, and season state.

## Domain Model

### Entities

- **Sweepstake** - A game instance with users, race weeks, timestamps
- **User** - Player with ID, display name, timestamps
- **RaceWeek** - Race round with driver allocations, `isProcessed` flag
- **DriverAllocation** - Links user to allocated drivers for a race week, `isProcessed` flag

### Key Business Logic

**Driver Assignment (Mondays):**

1. Query F1 standings leaderboard
2. Assign each user 2 drivers: one from top half, one from bottom half
3. If assigned driver didn't race, substitute with their teammate who wasn't allocated that week

**Results Processing (Mondays):**

1. Fetch most recent race results (main race + sprint if applicable)
2. If race week not yet processed, calculate and award points to players
3. Check for sprint race results and add those points too
4. Mark race week as processed

**Points System:** Standard F1 points (25-18-15-12-10-8-6-4-2-1 for P1-P10), plus sprint points when applicable

## External API

**Jolpica F1 API** - Ergast-compatible F1 data API

- Base URL: `http://api.jolpi.ca/ergast/f1/`
- Docs: https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md
- Used for: standings, race results, driver/team data

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages and components
  - `page.tsx` - Route pages (function components, default exports)
  - `layout.tsx` - Shared layouts with metadata exports
  - `components/` - Reusable UI components organized by feature (e.g., `table/Table.tsx`, `tile/Tile.tsx`)
  - `admin/` - Admin section routes
- `public/` - Static assets

### Key Patterns

**Component Structure:**

- Components are function declarations (not arrow functions): `function ComponentName() {}`
- Use default exports: `export default ComponentName;`
- Props use inline type definitions: `{ children }: { children: React.ReactNode }`
- Generic components use TypeScript generics (see [Table.tsx](app/components/table/Table.tsx) for pattern)

**Styling:**

- Tailwind CSS v4 with `@import "tailwindcss"` syntax
- CSS variables for theming defined in [globals.css](app/globals.css)
- Dark mode via `prefers-color-scheme` media query
- Responsive classes: `md:` and `lg:` breakpoints

**Font:**

- Orbitron (Google Font) configured via `next/font` in layout

## Commands

```bash
pnpm dev      # Start dev server (localhost:3000)
pnpm build    # Production build
pnpm lint     # Run ESLint
```

## Conventions

- Use `@/*` path alias for imports (maps to project root)
- Page components: lowercase filename `page.tsx`, PascalCase function names
- Reusable components: PascalCase filename matching component name
- Empty state handling in components (see Table's `if (tableData.length === 0)` pattern)

## Tech Stack Versions

- Next.js 16.1.4, React 19.2.3, TypeScript 5, Tailwind CSS 4, ESLint 9
