import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import dayjs from "dayjs";
import { Pool } from "pg";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";

// Load env from .env, then .env.local (override), with a safe default
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const app = express();
const port = process.env.PORT || 3001;
const canvasTokenSecret = process.env.CANVAS_TOKEN_SECRET || "dev-secret-change-me";
const canvasApiBase = "https://canvas.instructure.com/api/v1";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/leit",
});

// Ensure storage for per-user Canvas tokens (encrypted)
const ensureCanvasTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS canvas_tokens (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      iv BYTEA NOT NULL,
      tag BYTEA NOT NULL,
      token_encrypted BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

ensureCanvasTable().catch((err) => {
  console.error("Failed to ensure canvas_tokens table", err);
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow local dev on any port for localhost / 127.0.0.1
    if (!origin) return callback(null, true);
    const allowed =
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (allowed) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(clerkMiddleware());

const deriveKey = (secret) => crypto.createHash("sha256").update(secret).digest();

const encryptToken = (token) => {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(canvasTokenSecret);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, encrypted };
};

const decryptToken = (iv, tag, encrypted) => {
  const key = deriveKey(canvasTokenSecret);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};

// Auth middleware using Clerk - verifies token and syncs user to database
const authMiddleware = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user info from Clerk
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const displayName = clerkUser.fullName || clerkUser.firstName || email;

    // Upsert user into database (sync Clerk user with local DB)
    const { rows } = await pool.query(
      `INSERT INTO users (external_sub, email, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (external_sub) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         updated_at = NOW()
       RETURNING id`,
      [auth.userId, email, displayName]
    );

    req.userId = rows[0].id;
    req.clerkUserId = auth.userId;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Auth ---
// Clerk handles signup/signin - we just need an endpoint to get current user info
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, external_sub, display_name, created_at, updated_at FROM users WHERE id = $1",
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

// --- Canvas Token Management ---
app.get("/api/canvas/token", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM canvas_tokens WHERE user_id = $1",
      [req.userId]
    );
    res.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error("Canvas token exists check error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/canvas/token", authMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }
  try {
    const { iv, tag, encrypted } = encryptToken(token);
    await pool.query(
      `INSERT INTO canvas_tokens (user_id, iv, tag, token_encrypted)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET iv = EXCLUDED.iv, tag = EXCLUDED.tag, token_encrypted = EXCLUDED.token_encrypted, updated_at = NOW()`,
      [req.userId, iv, tag, encrypted]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Canvas token save error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/canvas/token", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM canvas_tokens WHERE user_id = $1", [req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Canvas token delete error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Proxy Canvas requests with per-user token
app.use("/api/canvas", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT iv, tag, token_encrypted FROM canvas_tokens WHERE user_id = $1",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Canvas token not set" });
    }
    const { iv, tag, token_encrypted } = rows[0];
    const token = decryptToken(iv, tag, token_encrypted);

    const targetPath = req.originalUrl.replace("/api/canvas", "");
    const targetUrl = `${canvasApiBase}${targetPath}`;

    const method = req.method;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const body =
      method === "GET" || method === "HEAD" ? undefined : JSON.stringify(req.body);

    const canvasResp = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const text = await canvasResp.text();
    res.status(canvasResp.status);
    // Forward minimal headers
    res.set("Content-Type", canvasResp.headers.get("content-type") || "application/json");
    return res.send(text);
  } catch (error) {
    console.error("Canvas proxy error", error);
    return res.status(500).json({ error: "Canvas proxy failed" });
  }
});

// --- Spaced Repetition: update card schedule ---
const qualityToSM2 = (quality) => {
  switch (quality) {
    case "easy":
      return 5;
    case "good":
      return 4;
    case "hard":
      return 3;
    case "again":
    default:
      return 1;
  }
};

const updateSchedule = (card, qualityStr) => {
  const q = qualityToSM2(qualityStr);
  let ease = card.ease ?? 2.5;
  let interval = card.interval_days ?? 1;
  let lapses = card.lapses ?? 0;

  if (q < 3) {
    lapses += 1;
    interval = 1;
  } else {
    if (interval < 1) interval = 1;
    interval = interval * ease;
  }

  // SM-2 ease update
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const due_at = dayjs().add(interval, "day").toISOString();
  return { ease, interval_days: interval, lapses, due_at };
};

app.post("/api/cards/:id/review", authMiddleware, async (req, res) => {
  const { quality } = req.body;
  if (!quality) return res.status(400).json({ error: "quality is required" });
  try {
    // Verify card ownership via deck
    const { rows } = await pool.query(
      `SELECT c.ease, c.interval_days, c.lapses
       FROM cards c
       JOIN decks d ON c.deck_id = d.id
       WHERE c.id = $1 AND d.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Card not found" });

    const current = rows[0];
    const updated = updateSchedule(current, quality);

    const { rows: updatedRows } = await pool.query(
      `UPDATE cards
       SET ease = $1, interval_days = $2, lapses = $3, due_at = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [updated.ease, updated.interval_days, updated.lapses, updated.due_at, req.params.id]
    );

    res.json({ data: updatedRows[0] });
  } catch (error) {
    console.error("Card review update error", error);
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
app.get("/api/decks", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
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
      "SELECT * FROM decks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
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
      `INSERT INTO decks (user_id, title, tags, source)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, title, tags || [], source || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    console.error("Create deck error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Cards ---
app.get("/api/cards", authMiddleware, async (req, res) => {
  try {
    // Only return cards from decks owned by the authenticated user
    const { rows } = await pool.query(
      `SELECT c.* FROM cards c
       JOIN decks d ON c.deck_id = d.id
       WHERE d.user_id = $1
       ORDER BY c.created_at ASC`,
      [req.userId]
    );
    res.json({ data: rows });
  } catch (error) {
    console.error("Get cards error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/decks/:deckId/cards", authMiddleware, async (req, res) => {
  try {
    // Verify deck ownership before returning cards
    const { rows: deckRows } = await pool.query(
      "SELECT id FROM decks WHERE id = $1 AND user_id = $2",
      [req.params.deckId, req.userId]
    );
    if (deckRows.length === 0) {
      return res.status(404).json({ error: "Deck not found" });
    }
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
    // Verify deck ownership before creating card
    const { rows: deckRows } = await pool.query(
      "SELECT id FROM decks WHERE id = $1 AND user_id = $2",
      [deck_id, req.userId]
    );
    if (deckRows.length === 0) {
      return res.status(404).json({ error: "Deck not found" });
    }
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

    // Get unique deck_ids from cards and verify ownership
    const deckIds = [...new Set(cards.map(c => c.deck_id).filter(Boolean))];
    if (deckIds.length > 0) {
      const { rows: ownedDecks } = await client.query(
        "SELECT id FROM decks WHERE id = ANY($1::uuid[]) AND user_id = $2",
        [deckIds, req.userId]
      );
      const ownedDeckIds = new Set(ownedDecks.map(d => d.id));
      for (const deckId of deckIds) {
        if (!ownedDeckIds.has(deckId)) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "Deck not found or not owned by user" });
        }
      }
    }

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

// --- AI / DeepSeek Proxy ---
const deepseekEndpoint = process.env.DEEPSEEK_ENDPOINT;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const deepseekDeployment = process.env.DEEPSEEK_DEPLOYMENT || "DeepSeek-V3.2";

app.post("/api/ai/chat", authMiddleware, async (req, res) => {
  // Check if DeepSeek is configured
  if (!deepseekEndpoint || !deepseekApiKey) {
    return res.status(503).json({ error: "AI service not configured" });
  }

  const { messages, max_tokens = 500 } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    // Azure OpenAI compatible endpoint
    const apiUrl = `${deepseekEndpoint.replace(/\/$/, "")}/chat/completions`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": deepseekApiKey,
      },
      body: JSON.stringify({
        model: deepseekDeployment,
        messages,
        max_tokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      return res.status(response.status).json({ error: "AI service error", details: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("DeepSeek proxy error:", error);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

// Check if AI is available (no auth required for feature detection)
app.get("/api/ai/status", (_req, res) => {
  res.json({
    available: !!(deepseekEndpoint && deepseekApiKey),
  });
});

app.listen(port, () => {
  console.log(`Local API server running on http://localhost:${port}`);
});

