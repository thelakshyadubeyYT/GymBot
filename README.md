# NVIDIA Gym Trainer API

A gym trainer chatbot API powered by NVIDIA NIM — built with Node.js/Express.

---

## Deploy to Render (free, public URL in ~2 min)

1. Push this folder to a GitHub repo (public or private)
2. Go to https://render.com → **New → Web Service**
3. Connect your GitHub repo
4. Set these values:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
   - **Plan:** Free
5. Add your environment variables:
   - `NVIDIA_API_KEY` = `your_nvidia_key_here`
   - `BEARER_TOKEN` = `your_secret_token_here`
6. Click **Deploy** — you'll get a URL like `https://gym-trainer-xxxx.onrender.com`

---

## Deploy to Railway (free, fast)

1. Go to https://railway.app → **New Project → Deploy from GitHub**
2. Select this repo
3. Go to **Variables** tab and add:
   - `NVIDIA_API_KEY` = `your_nvidia_key_here`
   - `BEARER_TOKEN` = `your_secret_token_here`
4. Railway auto-detects Node.js — no config needed
5. Done — URL appears in your dashboard

---

## Deploy to Replit (instant, no GitHub needed)

1. Go to https://replit.com → **Create Repl → Import from ZIP**
2. Upload this folder as a zip
3. Go to **Secrets** tab and add:
   - `NVIDIA_API_KEY` = `your_nvidia_key_here`
   - `BEARER_TOKEN` = `your_secret_token_here`
4. Click **Run** — public URL is shown immediately

---

## Get a free NVIDIA API key

Go to https://build.nvidia.com, sign up, and grab your free API key.

---

## API Reference

### Base URL
```
https://your-deployment-url.com
```

### Authentication

The `/chat` endpoint requires a bearer token. Pass it in every request:

```
Authorization: Bearer your_secret_token_here
```

`/health` is public and does not require authentication.

---

### GET /health
Public health check.

**Response (200):**
```json
{
  "status": "ok",
  "message": "NVIDIA gym trainer chatbot is running (39 RPM limit)",
  "model": "meta/llama-3.1-8b-instruct",
  "uptime_seconds": 120
}
```

---

### POST /chat
Send a message, get a trainer response.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer your_secret_token_here
```

**Request body:**
```json
{
  "message": "Give me a beginner chest workout"
}
```

**Response (200):**
```json
{
  "response": "Great choice! Here's a beginner chest workout..."
}
```

**Response (400) — missing message:**
```json
{
  "error": "Message is required"
}
```

**Response (401) — missing/malformed auth header:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or malformed Authorization header. Expected: Bearer <token>"
}
```

**Response (403) — wrong token:**
```json
{
  "error": "Forbidden",
  "message": "Invalid bearer token."
}
```

**Response (429) — rate limited:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": 429
}
```

**Response (500) — server/API error:**
```json
{
  "error": "NVIDIA API error: 401"
}
```

---

## Rate Limit

39 requests per minute per IP address.

---

## Example curl

```bash
curl -X POST https://your-url.com/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_token_here" \
  -d '{"message": "What is the best protein intake for muscle gain?"}'
```

---

## Local development

```bash
# Set your env vars
export NVIDIA_API_KEY=your_nvidia_key_here
export BEARER_TOKEN=your_secret_token_here

# Install and run
npm install
npm start
```
