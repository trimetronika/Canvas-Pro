import express from "express";
import fs from "fs/promises";
import path from "path";
import cors from "cors";

const DATA_FILE = path.join(process.cwd(), "user_data.json");

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({}));
  }
}

async function startServer() {
  await ensureDataFile();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Sync Data - Fetch
  app.get("/api/sync/:email", async (req, res) => {
    const { email } = req.params;
    try {
      const data = JSON.parse(await fs.readFile(DATA_FILE, "utf-8"));
      const userData = data[email.toLowerCase()] || null;
      res.json(userData);
    } catch (error) {
      console.error("Fetch error:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Sync Data - Save
  app.post("/api/sync", async (req, res) => {
    const { email, payload } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const data = JSON.parse(await fs.readFile(DATA_FILE, "utf-8"));
      data[email.toLowerCase()] = {
        ...payload,
        lastSynced: Date.now()
      };
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true, lastSynced: data[email.toLowerCase()].lastSynced });
    } catch (error) {
      console.error("Save error:", error);
      res.status(500).json({ error: "Failed to save user data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
