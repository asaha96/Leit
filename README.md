# Leit - AI-Enhanced Flashcard Platform

A production-ready spaced repetition flashcard app with AI-powered learning assistance, Express/Postgres backend, Canvas LMS integration, and a polished responsive UI.

## Feature Highlights

### Study & Learning
- **Spaced repetition**: Server-side SM-2 scheduling (Again/Hard/Good/Easy) with ease, interval, and lapse tracking
- **Study modes**: Due-only filtering, pause/resume sessions, keyboard shortcuts (Enter to reveal, 1–4 for quality)
- **Practice Q&A**: Generate Short Answer, Fill-in-Blank, and Multiple Choice questions from your cards
- **AI-powered learning** (optional): Get hints during practice and explanations after answering (DeepSeek integration)

### Deck Management
- **User-scoped data**: Each user sees only their own decks and cards (multi-tenant)
- **Import options**: CSV import, quick demo deck creation
- **Organization**: Tags, sources, card health metrics

### Dashboard & Analytics
- **Metrics**: Mastery %, due today, study streak, total cards
- **Card health**: Average ease, lapses, due within 7 days, unscheduled cards
- **Weakest cards**: Identify cards needing more practice
- **Canvas LMS**: Per-user encrypted token storage; view courses and assignments

### UI/UX
- **Responsive design**: Works on desktop, tablet, and mobile
- **Accessibility**: ARIA labels, focus states, 44px touch targets
- **Theming**: Georgia Tech-inspired palette, dark/light mode toggle
- **Loading states**: Skeleton loaders for smooth UX

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui
- **Backend**: Express + PostgreSQL
- **Testing**: Vitest (13 API smoke tests)
- **AI**: DeepSeek via Azure (optional)

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up PostgreSQL
```bash
# Create database
createdb leit

# Run schema
psql postgres://localhost/leit -f server/schema.sql

# For existing databases, run migration
psql postgres://localhost/leit -f server/migrations/001_add_user_id_to_decks.sql
```

### 3. Configure environment
Copy `env.local.sample` to `.env.local` and configure:
```bash
# Required
DATABASE_URL=postgres://localhost:5432/leit
JWT_SECRET=your-secure-secret-here
CANVAS_TOKEN_SECRET=another-secure-secret

# Optional - Canvas
VITE_CANVAS_API_KEY=

# Optional - Production API URL (leave empty for dev)
VITE_API_ORIGIN=

# Optional - DeepSeek AI (enables hints/explanations)
DEEPSEEK_ENDPOINT=https://your-resource.services.ai.azure.com/openai/v1/
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_DEPLOYMENT=DeepSeek-V3
```

### 4. Run the app
```bash
# Terminal 1: Start API server
npm run server:dev   # Runs on port 3001

# Terminal 2: Start frontend
npm run dev          # Runs on port 5177
```

### 5. Open the app
Visit http://127.0.0.1:5177, sign up, and start learning!

## Testing
```bash
# Run all tests (requires server running)
npm run test

# Watch mode
npm run test:watch
```

## Project Structure
```
├── server/
│   ├── index.js           # Express API server
│   ├── schema.sql         # Database schema
│   └── migrations/        # Database migrations
├── src/
│   ├── components/        # React components
│   ├── pages/             # Page components (Index, Dashboard, Practice, Auth)
│   ├── services/          # API services (database, canvas, AI, session)
│   ├── hooks/             # React hooks (useAuth, useToast)
│   ├── lib/               # Utilities (api.ts)
│   └── types/             # TypeScript types
├── tests/                 # API tests
└── docs/                  # Documentation
```

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in
- `GET /api/auth/me` - Get current user

### Decks & Cards
- `GET /api/decks` - List user's decks
- `POST /api/decks` - Create deck
- `GET /api/decks/:id/cards` - Get cards in deck
- `POST /api/cards` - Create card
- `POST /api/cards/:id/review` - Update card schedule (SM-2)

### Sessions
- `POST /api/sessions` - Start session
- `PATCH /api/sessions/:id/finish` - Finish session
- `POST /api/session-events` - Record answer

### AI (optional)
- `GET /api/ai/status` - Check if AI is available
- `POST /api/ai/chat` - Chat completion (proxies to DeepSeek)

## Key Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5177) |
| `npm run server:dev` | Start Express API (port 3001) |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |

## Production Deployment

See `docs/TODO_LEIT_RALPH_DEPLOY.md` for the complete pre-deployment checklist.

Key considerations:
- Set strong `JWT_SECRET` and `CANVAS_TOKEN_SECRET`
- Configure `VITE_API_ORIGIN` for your API domain
- Restrict CORS origins in `server/index.js`
- Run database migrations
- Set up backups

## License
MIT
