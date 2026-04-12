import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, payload } = req.body as { email?: string; payload?: unknown };
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(payload ?? ""), "utf8");
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: "Payload too large" });
  }

  try {
    const data = {
      ...(typeof payload === "object" && payload !== null ? payload : {}),
      lastSynced: Date.now(),
    };
    await kv.set(`user:${email.toLowerCase()}`, data);
    res.json({ success: true, lastSynced: data.lastSynced });
  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ error: "Failed to save user data" });
  }
}
