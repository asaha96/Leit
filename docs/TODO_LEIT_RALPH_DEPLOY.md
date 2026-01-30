# Leit – TODO List for Ralph Loop & Pre-Deployment

This document lists **what exists**, **what to fix/integrate**, **Ralph-loop–ready tasks** (clear completion criteria, testable), **DeepSeek API integration**, and **pre-deployment checklist**.

---

## Start script (run once)

Run this in your Ralph loop (e.g. Cursor chat or command):

```
/ralph-loop "Build a hello world API" --completion-promise "DONE" --max-iterations 10
```

Replace the prompt and options as needed for other tasks (see §5 for more examples).

---

## 1. What We Have (Inventory)

| Area | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ | Local Express: signup, signin, JWT, `/api/auth/me`. No Supabase in use. |
| **Decks** | ✅ | CRUD via API; no `user_id` – decks are global (see Fixes). |
| **Cards** | ✅ | CRUD, bulk insert; SM-2 on server (`/api/cards/:id/review`). |
| **Sessions** | ✅ | Create, finish, session_events; tied to `user_id`. |
| **Study UX** | ✅ | DeckPicker, FlashcardSession, due-only toggle, keyboard shortcuts. |
| **Practice** | ✅ | SA/FIB/MCQ from deck cards; evaluator (Levenshtein); session events. |
| **Dashboard** | ✅ | Mastery %, due today, streak, weak cards, card health; Canvas tab. |
| **Canvas** | ✅ | Per-user encrypted token; proxy `/api/canvas/*`; courses/assignments. |
| **Scheduler** | ⚠️ | Server: full SM-2. Client: simple intervals (1m/10m/1d/3d) for labels + `session_events.next_due`. |
| **LTI** | 🔶 | Placeholders only (launch, deeplink, ags); not implemented. |
| **Supabase** | 🔶 | Client + types present; app uses Express only – dead code. |
| **Tests** | ❌ | No unit or e2e tests. |
| **Config** | ⚠️ | Vite port 8080 in config; README says 5177. `env.local.sample` had real key (fix below). |

---

## 2. Fixes & Integration Improvements (Ralph-Ready)

These are good candidates for a **Ralph loop**: well-defined, verifiable, incremental.

### 2.1 Data isolation: user-scoped decks and cards

- **Current:** `decks` and `cards` have no `user_id`; all users see the same data.
- **Goal:** Each user sees only their own decks (and cards via deck).
- **Ralph prompt example:**
  - Add `user_id` to `decks` (FK to `users`). Migrate existing rows (e.g. assign to first user or leave NULL + backfill).
  - All deck/card API routes filter by `req.userId`. Create deck with `user_id = req.userId`.
  - Frontend unchanged (already uses auth); verify deck list and card access are per-user.
  - **Completion:** All deck/card reads and writes scoped by `user_id`; no cross-user data; output `<promise>COMPLETE</promise>`.
- **Verification:** Create two users; create decks as each; confirm each sees only own decks.

---

### 2.2 Single source of truth for scheduling (client vs server)

- **Current:** Server uses SM-2 for `cards.due_at`. Client uses `utils/scheduler.ts` (fixed intervals) for labels and `session_events.next_due`.
- **Goal:** Use server SM-2 as single source; client uses server response for next_due where needed.
- **Ralph prompt example:**
  - After each card review, client already calls `POST /api/cards/:id/review`; server returns updated card (including `due_at`).
  - In `SessionManager.recordAnswer` and/or `FlashcardSession`, use `due_at` from review response for `session_events.next_due` instead of `calculateNextDue(quality)`.
  - Keep `getQualityLabel` / `getQualityColor` in client for UI only; remove or narrow client `calculateNextDue` usage to “display only when server data missing”.
  - **Completion:** Session events store server-derived next_due; client scheduling logic reduced to display helpers; output `<promise>COMPLETE</promise>`.
- **Verification:** Finish a session; check `session_events.next_due` and `cards.due_at` align with server SM-2.

---

### 2.3 Remove or gate Supabase integration

- **Current:** `integrations/supabase/client.ts` and `types.ts` exist; app uses Express auth only.
- **Goal:** No dead code or runtime errors when Supabase env is missing.
- **Ralph prompt example:**
  - Option A: Remove Supabase client and types; delete any imports.
  - Option B: Lazy-init Supabase only when `VITE_SUPABASE_URL` and key are set; no init on missing env.
  - **Completion:** No Supabase usage in auth flow; no console errors from missing Supabase env; output `<promise>COMPLETE</promise>`.
- **Verification:** Build and run without Supabase env vars; sign up/sign in still works.

---

### 2.4 Config and docs consistency

- **Current:** Vite port 8080 in `vite.config.ts`; README says 5177. Env sample had real API key.
- **Goal:** One documented port; safe env sample.
- **Ralph prompt example:**
  - Use a single dev port (e.g. 5177): set in `vite.config.ts` and document in README (and any other docs). Update proxy if needed.
  - Ensure `env.local.sample` has no real secrets (e.g. `VITE_CANVAS_API_KEY=` or `your-canvas-token`).
  - **Completion:** README and config use same port; env sample is placeholder-only; output `<promise>COMPLETE</promise>`.

---

### 2.5 API base URL for production

- **Current:** Frontend uses relative `/api`; Vite proxy to `localhost:3001` works in dev only.
- **Goal:** Production builds call correct API origin.
- **Ralph prompt example:**
  - Add `VITE_API_ORIGIN` (e.g. `http://localhost:3001` in dev, `https://api.yourdomain.com` in prod). In `api.ts`, use `VITE_API_ORIGIN + '/api' + path` when set, else current behavior.
  - Document in README and env sample.
  - **Completion:** Dev and prod use correct API origin; output `<promise>COMPLETE</promise>`.

---

### 2.6 Tests (foundation for future Ralph runs)

- **Current:** No tests.
- **Goal:** At least smoke tests for API and critical paths.
- **Ralph prompt example (Phase 1 – API):**
  - Add a test runner (e.g. Vitest). For server: health, auth signup/signin, protected deck list (with JWT). Use in-memory or test DB if possible.
  - **Completion:** `npm run test` passes; health + auth + one protected route covered; output `<promise>COMPLETE</promise>`.
- **Ralph prompt example (Phase 2 – evaluator/scheduler):**
  - Unit tests for `evaluator.ts` (exact match, partial, wrong) and `scheduler.ts` quality labels.
  - **Completion:** All branches in evaluator and scheduler covered; output `<promise>COMPLETE</promise>`.

---

### 2.7 UI polish: production-ready educational app

- **Current:** Functional UI; may lack consistent spacing, loading/empty states, accessibility, and a cohesive “educational” feel.
- **Goal:** Polished, production-ready frontend suitable for an educational app: clear hierarchy, calm palette, consistent components, loading/empty states, responsive, accessible.
- **Ralph prompt example:**
  - **Typography & layout:** Use a readable, friendly font (e.g. system UI or a single custom font); consistent heading scale and line-height; max line length for readability on Study/Practice/Dashboard.
  - **Spacing & rhythm:** Consistent padding/margins (e.g. 4/8/16/24 scale); card and section spacing; no cramped buttons or labels.
  - **Educational tone:** Calm, focused color palette (avoid harsh contrast); clear primary actions (Start session, Submit, Next); success/feedback states that feel encouraging (e.g. Session complete, Correct/Incorrect with soft colors).
  - **Loading & empty states:** Skeleton or spinner for deck list, dashboard, practice; empty states for “No decks yet”, “No cards in this deck”, “No sessions” with short copy and CTA (e.g. Create deck, Import CSV).
  - **Responsive:** Nav and main content usable on small screens (stack or collapse nav); DeckPicker and FlashcardSession readable on tablet/mobile; touch-friendly tap targets (min ~44px).
  - **Accessibility:** Focus visible on interactive elements; sufficient color contrast (WCAG AA); aria-labels where needed (e.g. Study/Dashboard/Practice tabs, quality buttons); no keyboard traps in modals/dialogs.
  - **Dark/light:** Theme toggle already exists; ensure charts, cards, and borders look good in both modes; no low-contrast text.
  - **Consistency:** Buttons, inputs, cards, badges use the same design tokens; DeckPicker, Dashboard, Practice, Auth share the same visual language.
  - **Completion:** All main flows (Auth, Study, Dashboard, Practice) look polished and consistent; loading and empty states in place; responsive and keyboard-navigable; output `<promise>COMPLETE</promise>`.
- **Verification:** Click through Auth → Study (picker, session, complete) → Dashboard → Practice; resize to mobile width; toggle theme; tab through key actions. No broken layout or missing states.

---

## 3. DeepSeek API Integration (New Feature)

Use your **Azure-hosted DeepSeek** endpoint for an optional “AI” feature (e.g. hints, practice question generation, or feedback). Keep it behind env so the app runs without it.

### 3.1 Backend: DeepSeek proxy (recommended)

- **Goal:** No API key in frontend; one backend route that calls DeepSeek.
- **Tasks:**
  1. Env: `DEEPSEEK_API_KEY`, `DEEPSEEK_ENDPOINT` (e.g. `https://aritraintelligence.services.ai.azure.com/openai/v1/`), `DEEPSEEK_DEPLOYMENT` (e.g. `DeepSeek-V3.2`).
  2. In `server/index.js` (or a small route file), add `POST /api/ai/chat` (or `/api/ai/complete`). Use `openai` SDK with `baseURL: process.env.DEEPSEEK_ENDPOINT`, `apiKey: process.env.DEEPSEEK_API_KEY`, `model: process.env.DEEPSEEK_DEPLOYMENT`. Forward request body (e.g. `messages`) and return completion. Protect with `authMiddleware`.
  3. Rate-limit or cap token usage if needed.

### 3.2 Frontend: optional AI usage

- **Goal:** One place that calls the new API (e.g. “Explain this card”, “Generate a practice question”).
- **Tasks:**
  1. Add a small `aiService.ts` that calls `POST /api/ai/chat` with `apiFetch`.
  2. Use it from Practice (e.g. generate question from card text) and/or FlashcardSession (e.g. “Get hint” that asks DeepSeek for a hint). Handle “AI not configured” (e.g. 503 or feature flag) so app works without DeepSeek.

### 3.3 Ralph-style prompt for DeepSeek integration

- **Prompt:** Implement backend proxy for DeepSeek (Azure endpoint) with env-based config and auth. Add one frontend feature that uses it (e.g. “Generate one practice question from this card”). If env is missing, feature is disabled and no errors. Output `<promise>COMPLETE</promise>` when: proxy works with a test message, frontend can request one AI action, and app runs without DeepSeek env.
- **Verification:** Set env → use feature; unset env → no crashes, feature hidden or disabled.

---

## 4. Pre-Deployment Checklist

Use this before going live (and optionally drive some items with Ralph).

### Security & config

- [x] **Secrets:** No real keys in repo; `env.local.sample` (and any `.env*` in docs) use placeholders only.
- [ ] **JWT:** Strong `JWT_SECRET` in production; consider rotation.
- [ ] **CORS:** Restrict `origin` to your frontend origin(s) in production (no `*`).
- [x] **Canvas token secret:** `CANVAS_TOKEN_SECRET` documented in env samples.

### Data & auth

- [x] **User-scoped data:** Decks (and thus cards) scoped by `user_id` (see 2.1).
- [ ] **DB:** Production Postgres; migrations applied; backups in place.

### API & frontend

- [x] **API base URL:** Production frontend uses `VITE_API_ORIGIN` (see 2.5).
- [x] **Health:** `/health` used by orchestrator/load balancer; no sensitive data.

### UI & experience

- [x] **UI polish:** Production-ready educational UI (see 2.7): typography, spacing, loading/empty states, responsive, accessibility, dark/light, consistent components.

### Optional but recommended

- [x] **Tests:** At least smoke tests for API and auth (see 2.6). Run with `npm run test`.
- [ ] **LTI:** If you need LTI, implement launch/validation (currently placeholders); otherwise remove or clearly mark as "future".
- [x] **Supabase:** Removed (dead code was not used by app).

### DeepSeek (optional - if you enable it)

- [x] **Backend proxy:** POST /api/ai/chat proxies to Azure DeepSeek (env-based config).
- [x] **Frontend service:** aiService.ts with hint, explanation, and question generation.
- [x] **UI integration:** AI hints and explanations in Practice page.
- [ ] **Env in prod:** Set `DEEPSEEK_API_KEY`, `DEEPSEEK_ENDPOINT`, `DEEPSEEK_DEPLOYMENT` in production.
- [ ] **Quotas:** Rate limiting or token caps to avoid cost overruns (if needed).

---

## 5. Ralph Loop Commands (Examples)

Run once; the stop hook will re-feed the same prompt until completion or max iterations.

**User-scoped decks (2.1):**
```bash
/ralph-loop "Add user_id to decks table and scope all deck/card API routes by authenticated user. Migrate existing decks (e.g. assign to first user). Verify two users see only their own decks. Output <promise>COMPLETE</promise> when done." --completion-promise "COMPLETE" --max-iterations 25
```

**Scheduler single source of truth (2.2):**
```bash
/ralph-loop "Use server SM-2 response (due_at) for session_events.next_due instead of client calculateNextDue. Keep client scheduler only for UI labels. Output <promise>COMPLETE</promise> when session events use server due_at." --completion-promise "COMPLETE" --max-iterations 15
```

**Tests – API smoke (2.6):**
```bash
/ralph-loop "Add Vitest (or current test runner). Add API tests: GET /health, POST /api/auth/signup and signin, GET /api/decks with JWT. Use test DB or mock. npm run test must pass. Output <promise>COMPLETE</promise> when done." --completion-promise "COMPLETE" --max-iterations 20
```

**DeepSeek proxy + one feature:**
```bash
/ralph-loop "Add POST /api/ai/chat that proxies to Azure DeepSeek (env: DEEPSEEK_ENDPOINT, DEEPSEEK_API_KEY, DEEPSEEK_DEPLOYMENT). Add aiService and one UI feature (e.g. generate practice question). If env missing, feature disabled. Output <promise>COMPLETE</promise> when proxy and one feature work and app runs without env." --completion-promise "COMPLETE" --max-iterations 25
```

**UI polish – production-ready educational app (2.7):**
```bash
/ralph-loop "Polish the Leit frontend for production as an educational app. Apply: (1) Readable typography and consistent spacing/rhythm. (2) Calm, educational color tone; clear primary actions and encouraging feedback. (3) Loading states (skeletons/spinners) for deck list, dashboard, practice. (4) Empty states with short copy and CTA for no decks, no cards, no sessions. (5) Responsive layout and touch-friendly targets; nav and content usable on mobile. (6) Accessibility: visible focus, WCAG AA contrast, aria-labels on tabs and key buttons, no keyboard traps. (7) Dark/light theme consistent for cards, charts, borders. (8) Consistent design tokens across Auth, Study, Dashboard, Practice. Do not change API or backend. Output <promise>COMPLETE</promise> when all main flows look polished and verification (click-through, resize, theme toggle, keyboard nav) passes." --completion-promise "COMPLETE" --max-iterations 30
```

---

## 6. Summary Table

| Priority | Item | Status | Blocks deploy? |
|----------|------|--------|----------------|
| High | User-scoped decks/cards (2.1) | ✅ Done | Yes (multi-tenant) |
| High | Secrets out of repo + env sample (2.4) | ✅ Done | Yes |
| High | API origin for prod (2.5) | ✅ Done | Yes |
| Medium | Scheduler single source (2.2) | ✅ Done | No |
| Medium | Supabase remove/gate (2.3) | ✅ Done (removed) | No (can break if env set wrong) |
| Medium | Config/docs port consistency (2.4) | ✅ Done | No |
| Medium | Tests (2.6) | ✅ Done | No (recommended) |
| Medium | UI polish – production-ready educational (2.7) | ✅ Done | No (recommended) |
| Feature | DeepSeek proxy + one feature (3) | ✅ Done | No |
| Later | LTI implementation or removal | ✅ Removed | No |

This gives you a single place to track **what exists**, **what to fix**, **Ralph-ready tasks**, **DeepSeek integration**, and **pre-deployment** for Leit.
