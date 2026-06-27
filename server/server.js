require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Allow all origins so Vercel can connect to Render
app.use(cors());
app.use(express.json());

// Available models via OpenRouter
const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", provider: "Google" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta" },
  { id: "mistralai/mistral-large-2411", name: "Mistral Large", provider: "Mistral" },
];

// GET /api/models — return available models
app.get("/api/models", (_req, res) => {
  res.json({ models: AVAILABLE_MODELS });
});

// POST /api/chat — stream chat completion from OpenRouter
app.post("/api/chat", async (req, res) => {
  const { messages, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "your_openrouter_api_key_here") {
    return res.status(500).json({
      error: "OpenRouter API key not configured. Please set OPENROUTER_API_KEY in server/.env",
    });
  }

  // Set up SSE headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "AI Chatbot",
      },
      body: JSON.stringify({
        model: model || "openai/gpt-4o-mini",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter API error:", response.status, errorBody);
      res.write(`data: ${JSON.stringify({ error: `OpenRouter API error: ${response.status}` })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
            return res.end();
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (data !== "[DONE]") {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch {
              // Skip
            }
          }
        }
      }
    } finally {
      if (!res.writableEnded) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }

    // Handle client disconnect
    req.on("close", () => {
      reader.cancel();
      if (!res.writableEnded) {
        res.end();
      }
    });
  } catch (err) {
    console.error("Server error:", err);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Chatbot server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Models list:  http://localhost:${PORT}/api/models\n`);
});
