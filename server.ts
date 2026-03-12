import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/opencode", async (req, res) => {
    try {
      const { prompt, model } = req.body;
      const OPENCODE_API_KEY = "sk-pwn95V3tyj6pkFVFbGSLUyKKz4dF6n7TaLIcd4r9OQIfzEDgzAZ5q3XHrVfxiGet";
      
      const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENCODE_API_KEY}`
        },
        body: JSON.stringify({
          model: model || "minimax-m2.5",
          messages: [
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).json({ error: `Opencode API error: ${response.status} ${errorData}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Opencode proxy error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
