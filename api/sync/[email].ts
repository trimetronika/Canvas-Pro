import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.query as { email?: string };
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  try {
    const userData = await kv.get(`user:${email.toLowerCase()}`);
    res.json(userData ?? null);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
}
