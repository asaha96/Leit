/**
 * API Smoke Tests
 *
 * These tests verify the core API endpoints work correctly.
 * Run with: npm run test
 *
 * Prerequisites:
 * - Server running on localhost:3001 (npm run server:dev)
 * - Database set up with schema (psql ... -f server/schema.sql)
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3001';

// Generate unique email for each test run to avoid conflicts
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'testPassword123!';
let authToken = null;

describe('API Health', () => {
  it('GET /health should return ok status', async () => {
    const res = await fetch(`${API_BASE}/health`);
    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data.status).toBe('ok');
  });
});

describe('Auth API', () => {
  it('POST /api/auth/signup should create a new user', async () => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: 'Test User',
      }),
    });

    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail.toLowerCase());

    // Save token for later tests
    authToken = data.token;
  });

  it('POST /api/auth/signup should reject duplicate email', async () => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    expect(res.status).toBe(409);
  });

  it('POST /api/auth/signin should authenticate existing user', async () => {
    const res = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(testEmail.toLowerCase());
  });

  it('POST /api/auth/signin should reject wrong password', async () => {
    const res = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'wrongPassword',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me should return current user with valid token', async () => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail.toLowerCase());
  });

  it('GET /api/auth/me should reject invalid token', async () => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(res.status).toBe(401);
  });
});

describe('Decks API (Protected)', () => {
  it('GET /api/decks should require authentication', async () => {
    const res = await fetch(`${API_BASE}/api/decks`);
    expect(res.status).toBe(401);
  });

  it('GET /api/decks should return user decks with valid token', async () => {
    const res = await fetch(`${API_BASE}/api/decks`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(Array.isArray(data.data)).toBe(true);
  });

  let createdDeckId = null;

  it('POST /api/decks should create a new deck', async () => {
    const res = await fetch(`${API_BASE}/api/decks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Test Deck',
        tags: ['test'],
      }),
    });

    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.data.title).toBe('Test Deck');
    expect(data.data.user_id).toBeDefined();

    createdDeckId = data.data.id;
  });

  it('GET /api/decks/:id should return the created deck', async () => {
    const res = await fetch(`${API_BASE}/api/decks/${createdDeckId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data.data.id).toBe(createdDeckId);
    expect(data.data.title).toBe('Test Deck');
  });
});

describe('Cards API (Protected)', () => {
  let deckId = null;

  beforeAll(async () => {
    // Create a deck for card tests
    const res = await fetch(`${API_BASE}/api/decks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: 'Card Test Deck',
      }),
    });
    const data = await res.json();
    deckId = data.data.id;
  });

  it('POST /api/cards should create a card in owned deck', async () => {
    const res = await fetch(`${API_BASE}/api/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        deck_id: deckId,
        front: 'What is 2+2?',
        back: '4',
        answers: ['4', 'four'],
      }),
    });

    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.data.front).toBe('What is 2+2?');
    expect(data.data.deck_id).toBe(deckId);
  });

  it('GET /api/decks/:deckId/cards should return cards for owned deck', async () => {
    const res = await fetch(`${API_BASE}/api/decks/${deckId}/cards`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });
});
