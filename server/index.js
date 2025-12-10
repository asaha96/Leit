import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Load env from .env, then .env.local (override), with a safe default
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const app = express();
const port = process.env.PORT || 3001;
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/leit",
});

app.use(cors({
  origin: [
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:8081",
    "http://localhost:8081",
    "http://127.0.0.1:8082",
    "http://localhost:8082",
  ],
  credentials: true,
}));
app.use(express.json());

const generateToken = (userId) =>
  jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" });

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.substring("Bearer ".length);
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Auth ---
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at, updated_at`,
      [email.toLowerCase(), displayName || null, passwordHash]
    );

    const user = rows[0];
    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (error) {
    console.error("Signup error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, email, display_name, password_hash, created_at, updated_at FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    delete user.password_hash;
    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (error) {
    console.error("Signin error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, display_name, created_at, updated_at FROM users WHERE id = $1",
      [req.userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Me error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Attach userId if token provided; useful for optional auth
const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.substring("Bearer ".length);
    try {
      const payload = jwt.verify(token, jwtSecret);
      req.userId = payload.userId;
    } catch (e) {
      // ignore invalid token
    }
  }
  next();
};

// --- Decks ---
app.get("/api/decks", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM decks ORDER BY created_at DESC"
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("Get decks error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/decks/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM decks WHERE id = $1",
      [req.params.id]
    );
    const deck = rows[0];
    if (!deck) return res.status(404).json({ error: "Deck not found" });
    res.json({ data: deck });
  } catch (error) {
    console.error("Get deck error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/decks", authMiddleware, async (req, res) => {
  const { title, tags, source } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO decks (title, tags, source)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, tags || [], source || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error("Create deck error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Cards ---
app.get("/api/cards", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM cards ORDER BY created_at ASC"
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("Get cards error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/decks/:deckId/cards", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM cards WHERE deck_id = $1 ORDER BY created_at ASC",
      [req.params.deckId]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("Get deck cards error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/cards", authMiddleware, async (req, res) => {
  const { deck_id, front, back, hints, answers, tags, media_refs } = req.body;
  if (!deck_id || !front || !back) {
    return res.status(400).json({ error: "deck_id, front, back are required" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO cards (deck_id, front, back, hints, answers, tags, media_refs)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        deck_id,
        front,
        back,
        hints || [],
        answers || [],
        tags || [],
        media_refs || null,
      ]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error("Create card error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/cards/bulk", authMiddleware, async (req, res) => {
  const { cards } = req.body;
  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: "cards array is required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = [];
    for (const card of cards) {
      const { deck_id, front, back, hints, answers, tags, media_refs } = card;
      const { rows } = await client.query(
        `INSERT INTO cards (deck_id, front, back, hints, answers, tags, media_refs)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          deck_id,
          front,
          back,
          hints || [],
          answers || [],
          tags || [],
          media_refs || null,
        ]
      );
      inserted.push(rows[0]);
    }
    await client.query("COMMIT");
    res.status(201).json({ data: inserted });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Bulk card insert error", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// --- Sessions ---
app.get("/api/sessions", authMiddleware, async (req, res) => {
  const includeEvents = req.query.includeEvents === "1";
  try {
    const { rows: sessions } = await pool.query(
      "SELECT * FROM sessions WHERE user_id = $1 ORDER BY started_at DESC",
      [req.userId]
    );

    if (!includeEvents) {
      return res.json({ data: sessions });
    }

    const { rows: events } = await pool.query(
      "SELECT * FROM session_events WHERE session_id = ANY($1::uuid[]) ORDER BY created_at ASC",
      [sessions.map((s) => s.id)]
    );

    const eventsBySession = events.reduce((acc, ev) => {
      acc[ev.session_id] = acc[ev.session_id] || [];
      acc[ev.session_id].push(ev);
      return acc;
    }, {});

    const withEvents = sessions.map((s) => ({
      ...s,
      session_events: eventsBySession[s.id] || [],
    }));

    res.json({ data: withEvents });
  } catch (error) {
    console.error("Get sessions error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/sessions", authMiddleware, async (req, res) => {
  const { deck_id, score } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO sessions (user_id, deck_id, score)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.userId, deck_id || null, score || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error("Create session error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/sessions/:id/finish", authMiddleware, async (req, res) => {
  const { score } = req.body;
  try {
    const { rowCount } = await pool.query(
      `UPDATE sessions
       SET finished_at = NOW(), score = $1
       WHERE id = $2 AND user_id = $3`,
      [score ?? null, req.params.id, req.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Session not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Finish session error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Session Events ---
app.post("/api/session-events", authMiddleware, async (req, res) => {
  const { session_id, card_id, response, correct, ai_score, quality, next_due } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: "session_id is required" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO session_events (session_id, card_id, response, correct, ai_score, quality, next_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [session_id, card_id || null, response || null, correct ?? null, ai_score ?? null, quality || null, next_due || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error("Create session event error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/sessions/:id/events", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM session_events WHERE session_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("Get session events error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Local API server running on http://localhost:${port}`);
});

