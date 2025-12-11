# Leit - AI-Enhanced Flashcard Platform

Spaced repetition flashcards with a local Express/Postgres backend, rich UI, Canvas per-user tokens, and dark/light theming.

## Feature Highlights
- **Spaced repetition**: SM-2–style scheduling (Again/Hard/Good/Easy) per card (due_at, ease, interval, lapses).
- **Study UX**: Pause/resume, exit to deck picker, keyboard shortcuts (Enter to reveal, 1–4 for quality).
- **Due-only study**: Deck picker toggle to study only due/unscheduled cards.
- **Practice/Q&A**: Generates questions from deck cards; records session events.
- **Deck management**: CSV import, demo deck, tags, sources.
- **Dashboard analytics**: Mastery %, due today, streak, total cards, weakest cards, card health (avg ease, lapses, due ≤7d, unscheduled).
- **Canvas integration**: Per-user encrypted token storage and proxy; fetch courses/assignments. Token UI in Dashboard Canvas tab.
- **Theming**: GT-inspired palette, dark mode toggle, brand logo/favicon.

## Tech Stack
- Frontend: React + TypeScript + Vite, Tailwind + shadcn
- Backend: Express + Postgres (local)
- State/data: React Query

## Quick Start (Local)
1) Install deps
```bash
npm install
```
2) Postgres schema (runs once)
```bash
psql postgres://localhost/leit -f server/schema.sql
```
3) Env
- Copy `env.local.sample` to `.env.local` (gitignored) and set:
```
DATABASE_URL=postgres://localhost:5432/leit
JWT_SECRET=change-me
VITE_CANVAS_API_KEY=            # optional; Canvas token now per-user
```
4) Run
```bash
npm run server:dev   # API on 3001
npm run dev -- --host 127.0.0.1 --port 5177   # Vite
```
5) Sign up/sign in, create/import a deck, toggle “Due only,” and start a session.

## Canvas Token Notes
- Set token in Dashboard → Canvas tab; stored encrypted per user.
- Proxy calls go through `/api/canvas/*` with your token attached.

## Project Structure
```
src/
  components/      # UI (Navigation, DeckPicker, FlashcardSession, etc.)
  pages/           # Routes (Index, Dashboard, Practice, Auth)
  services/        # API/data (database, canvas, session manager, deck importer)
  types/           # Shared types (cards include due_at, ease, interval_days, lapses)
```

## Key Commands
- `npm run server:dev` — start Express API
- `npm run dev -- --host 127.0.0.1 --port 5177` — start Vite

## Data Model (core tables)
- decks, cards (with due_at, ease, interval_days, lapses), sessions, session_events, users, canvas_tokens

## Branding
- Favicon and navbar logo use `public/logo.png`.

## License
MIT