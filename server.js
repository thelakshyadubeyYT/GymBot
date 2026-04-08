const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// ── Config ─────────────────────────────────────────────────────
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.NVIDIA_API_KEY;
const BEARER_TOKEN = process.env.BEARER_TOKEN;

const SYSTEM_PROMPT = `You are a helpful and motivating virtual gym trainer.
You assist users with:
- Workout routines and exercise demonstrations
- Fitness goals (weight loss, muscle gain, endurance, etc.)
- Nutrition and diet tips
- Injury prevention and proper form
- Gym equipment usage and safety

Be encouraging, professional, and concise. Adapt advice to the user's fitness level. Never promote harmful or extreme practices.`;

// ── Validate env vars at startup ──────────────────────────────
const missing = [];
if (!API_KEY) missing.push("  NVIDIA_API_KEY=your_nvidia_key_here");
if (!BEARER_TOKEN) missing.push("  BEARER_TOKEN=your_secret_token_here");

if (missing.length > 0) {
  console.log("=".repeat(50));
  console.log("⚠️  ERROR: Missing environment variables!");
  console.log("=".repeat(50));
  console.log();
  console.log("Set these before starting:");
  missing.forEach((m) => console.log(m));
  console.log();
  console.log("NVIDIA key  : https://build.nvidia.com");
  console.log("BEARER_TOKEN: any secret string you choose");
  console.log("=".repeat(50));
  process.exit(1);
}

// ── Bearer token auth middleware ───────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header. Expected: Bearer <token>",
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  if (token !== BEARER_TOKEN) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Invalid bearer token.",
    });
  }

  next();
}

// ── Rate limiter (39 req/min per IP) ──────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 39;
const WINDOW_MS = 60 * 1000;

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  // Reset window if expired
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }

  // Check BEFORE incrementing so the 39th request still goes through
  if (entry.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: "Rate limit exceeded. Please try again later.",
      code: 429,
    });
  }

  entry.count++;
  rateLimitMap.set(ip, entry);
  next();
}

// ── Routes ─────────────────────────────────────────────────────

// Health check (public — no auth needed)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "NVIDIA gym trainer chatbot is running (39 RPM limit)",
    model: DEFAULT_MODEL,
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// Main chat endpoint (auth + rate limit)
app.post("/chat", authenticate, rateLimit, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
      }
      throw new Error(err.message || `NVIDIA API error: ${response.status}`);
    }

    const data = await response.json();
    const botResponse = data.choices?.[0]?.message?.content || "No response from model.";

    res.json({ response: botResponse });
  } catch (err) {
    console.error("Error calling NVIDIA API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("🤖 NVIDIA Gym Trainer API (Rate Limited: 39 RPM)");
  console.log("=".repeat(60));
  console.log();
  console.log(`✓ NVIDIA Key : ${API_KEY.slice(0, 10)}...${API_KEY.slice(-4)}`);
  console.log(`✓ Bearer Auth: enabled`);
  console.log(`✓ Endpoint   : ${NVIDIA_BASE_URL}`);
  console.log(`✓ Model      : ${DEFAULT_MODEL}`);
  console.log();
  console.log("Endpoints:");
  console.log(`  POST http://localhost:${PORT}/chat   (auth required, max 39 calls/min per IP)`);
  console.log(`  GET  http://localhost:${PORT}/health (public)`);
  console.log();
  console.log("Example request:");
  console.log(`  curl -X POST http://localhost:${PORT}/chat \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -H "Authorization: Bearer your_secret_token_here" \\`);
  console.log(`       -d '{"message": "Hello!"}'`);
  console.log();
  console.log("Press Ctrl+C to stop");
  console.log("=".repeat(60));
});
