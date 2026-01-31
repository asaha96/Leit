import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import dayjs from "dayjs";
import { createClient } from "@supabase/supabase-js";
import { createClerkClient, clerkMiddleware, getAuth } from "@clerk/express";

// Only load .env files in development (Vercel sets env vars directly)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
}

const app = express();
const port = process.env.PORT || 3001;
const canvasTokenSecret = process.env.CANVAS_TOKEN_SECRET || "dev-secret-change-me";
const canvasApiBase = "https://canvas.instructure.com/api/v1";

// Initialize Clerk client with explicit keys (required for serverless)
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});

// Initialize Supabase client with service role key for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  if (process.env.NODE_ENV === "production") {
    // Don't exit in production - let the error be caught per-request
    console.error("Supabase not configured - database operations will fail");
  }
}

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    if (origin?.endsWith(".vercel.app")) return callback(null, true);
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(clerkMiddleware());

// Encryption helpers for Canvas tokens
const deriveKey = (secret) => crypto.createHash("sha256").update(secret).digest();

const encryptToken = (token) => {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(canvasTokenSecret);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), encrypted: encrypted.toString("base64") };
};

const decryptToken = (ivBase64, tagBase64, encryptedBase64) => {
  const key = deriveKey(canvasTokenSecret);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedBase64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
};

// Auth middleware using Clerk - verifies token and syncs user to database
const authMiddleware = async (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      console.error("Auth: No userId in request");
      return res.status(401).json({ error: "Unauthorized - no user session" });
    }

    // Get user info from Clerk
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const displayName = clerkUser.fullName || clerkUser.firstName || email;

    // Upsert user into database using Supabase
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("external_sub", auth.userId)
      .single();

    let userId;
    if (existingUser) {
      // Update existing user
      await supabase
        .from("users")
        .update({ email, display_name: displayName, updated_at: new Date().toISOString() })
        .eq("external_sub", auth.userId);
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({ external_sub: auth.userId, email, display_name: displayName })
        .select("id")
        .single();
      if (error) throw error;
      userId = newUser.id;
    }

    req.userId = userId;
    req.clerkUserId = auth.userId;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Invalid token", details: err.message });
  }
};

// Health check endpoints
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Auth ---
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, external_sub, display_name, created_at, updated_at")
      .eq("id", req.userId)
      .single();

    if (error || !user) {
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
    const { data } = await supabase
      .from("canvas_tokens")
      .select("user_id")
      .eq("user_id", req.userId)
      .single();
    res.json({ exists: !!data });
  } catch (error) {
    res.json({ exists: false });
  }
});

app.post("/api/canvas/token", authMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }
  try {
    const { iv, tag, encrypted } = encryptToken(token);
    const { error } = await supabase
      .from("canvas_tokens")
      .upsert({
        user_id: req.userId,
        iv,
        tag,
        token_encrypted: encrypted,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error("Canvas token save error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/canvas/token", authMiddleware, async (req, res) => {
  try {
    await supabase.from("canvas_tokens").delete().eq("user_id", req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Canvas token delete error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Spaced Repetition ---
const qualityToSM2 = (quality) => {
  switch (quality) {
    case "easy": return 5;
    case "good": return 4;
    case "hard": return 3;
    case "again":
    default: return 1;
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

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const due_at = dayjs().add(interval, "day").toISOString();
  return { ease, interval_days: interval, lapses, due_at };
};

app.post("/api/cards/:id/review", authMiddleware, async (req, res) => {
  const { quality } = req.body;
  if (!quality) return res.status(400).json({ error: "quality is required" });

  try {
    // Get card with deck ownership check
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, ease, interval_days, lapses, deck_id, decks!inner(user_id)")
      .eq("id", req.params.id)
      .eq("decks.user_id", req.userId)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: "Card not found" });
    }

    const updated = updateSchedule(card, quality);

    const { data: updatedCard, error: updateError } = await supabase
      .from("cards")
      .update({
        ease: updated.ease,
        interval_days: updated.interval_days,
        lapses: updated.lapses,
        due_at: updated.due_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json({ data: updatedCard });
  } catch (error) {
    console.error("Card review update error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Decks ---
app.get("/api/decks", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error("Get decks error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/decks/:id", authMiddleware, async (req, res) => {
  try {
    const { data: deck, error } = await supabase
      .from("decks")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();

    if (error || !deck) {
      return res.status(404).json({ error: "Deck not found" });
    }
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
    const { data, error } = await supabase
      .from("decks")
      .insert({
        user_id: req.userId,
        title,
        tags: tags || [],
        source: source || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    console.error("Create deck error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Cards ---
app.get("/api/cards", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("cards")
      .select("*, decks!inner(user_id)")
      .eq("decks.user_id", req.userId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    // Remove the joined deck data from response
    const cards = (data || []).map(({ decks, ...card }) => card);
    res.json({ data: cards });
  } catch (error) {
    console.error("Get cards error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/decks/:deckId/cards", authMiddleware, async (req, res) => {
  try {
    // Verify deck ownership
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id")
      .eq("id", req.params.deckId)
      .eq("user_id", req.userId)
      .single();

    if (deckError || !deck) {
      return res.status(404).json({ error: "Deck not found" });
    }

    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", req.params.deckId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
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
    // Verify deck ownership
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id")
      .eq("id", deck_id)
      .eq("user_id", req.userId)
      .single();

    if (deckError || !deck) {
      return res.status(404).json({ error: "Deck not found" });
    }

    const { data, error } = await supabase
      .from("cards")
      .insert({
        deck_id,
        front,
        back,
        hints: hints || [],
        answers: answers || [],
        tags: tags || [],
        media_refs: media_refs || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
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

  try {
    // Get unique deck_ids and verify ownership
    const deckIds = [...new Set(cards.map((c) => c.deck_id).filter(Boolean))];

    const { data: ownedDecks, error: deckError } = await supabase
      .from("decks")
      .select("id")
      .in("id", deckIds)
      .eq("user_id", req.userId);

    if (deckError) throw deckError;

    const ownedDeckIds = new Set((ownedDecks || []).map((d) => d.id));
    for (const deckId of deckIds) {
      if (!ownedDeckIds.has(deckId)) {
        return res.status(404).json({ error: "Deck not found or not owned by user" });
      }
    }

    // Insert all cards
    const cardsToInsert = cards.map((card) => ({
      deck_id: card.deck_id,
      front: card.front,
      back: card.back,
      hints: card.hints || [],
      answers: card.answers || [],
      tags: card.tags || [],
      media_refs: card.media_refs || null,
    }));

    const { data, error } = await supabase
      .from("cards")
      .insert(cardsToInsert)
      .select();

    if (error) throw error;
    res.status(201).json({ data: data || [] });
  } catch (error) {
    console.error("Bulk card insert error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Sessions ---
app.get("/api/sessions", authMiddleware, async (req, res) => {
  const includeEvents = req.query.includeEvents === "1";

  try {
    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", req.userId)
      .order("started_at", { ascending: false });

    if (error) throw error;

    if (!includeEvents) {
      return res.json({ data: sessions || [] });
    }

    // Get events for all sessions
    const sessionIds = (sessions || []).map((s) => s.id);
    const { data: events, error: eventsError } = await supabase
      .from("session_events")
      .select("*")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true });

    if (eventsError) throw eventsError;

    const eventsBySession = (events || []).reduce((acc, ev) => {
      acc[ev.session_id] = acc[ev.session_id] || [];
      acc[ev.session_id].push(ev);
      return acc;
    }, {});

    const withEvents = (sessions || []).map((s) => ({
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
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: req.userId,
        deck_id: deck_id || null,
        score: score || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    console.error("Create session error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/sessions/:id/finish", authMiddleware, async (req, res) => {
  const { score } = req.body;

  try {
    const { data, error } = await supabase
      .from("sessions")
      .update({
        finished_at: new Date().toISOString(),
        score: score ?? null,
      })
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Session not found" });
    }
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
    const { data, error } = await supabase
      .from("session_events")
      .insert({
        session_id,
        card_id: card_id || null,
        response: response || null,
        correct: correct ?? null,
        ai_score: ai_score ?? null,
        quality: quality || null,
        next_due: next_due || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    console.error("Create session event error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/sessions/:id/events", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("session_events")
      .select("*")
      .eq("session_id", req.params.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error("Get session events error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- AI / DeepSeek Proxy ---
const deepseekEndpoint = process.env.DEEPSEEK_ENDPOINT;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const deepseekDeployment = process.env.DEEPSEEK_DEPLOYMENT || "DeepSeek-V3";

app.post("/api/ai/chat", authMiddleware, async (req, res) => {
  if (!deepseekEndpoint || !deepseekApiKey) {
    return res.status(503).json({ error: "AI service not configured" });
  }

  const { messages, max_tokens = 500 } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
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

app.get("/api/ai/status", (_req, res) => {
  res.json({
    available: !!(deepseekEndpoint && deepseekApiKey),
  });
});

// Only listen when running as standalone server
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Local API server running on http://localhost:${port}`);
  });
}

export default app;
