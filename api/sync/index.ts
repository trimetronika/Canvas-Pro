import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

type AnyObj = Record<string, unknown>;

function isPlainObject(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function uniqBy<T>(items: T[], keyFn: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    // last-write-wins: incoming (later in array) overwrites existing cloud entry
    map.set(k, item);
  }
  return Array.from(map.values());
}

function mergePlansById(
  incoming: unknown[] | undefined,
  existing: unknown[] | undefined
): unknown[] {
  const existingItems = Array.isArray(existing) ? existing : [];
  const incomingItems = Array.isArray(incoming) ? incoming : [];
  // cloud first, then incoming — so incoming (newer write) wins on duplicate keys
  return uniqBy([...existingItems, ...incomingItems], (p: unknown) => {
    if (isPlainObject(p)) {
      return String(p["id"] ?? p["timestamp"] ?? "");
    }
    return "";
  });
}

function mergeDatabase(
  incoming: unknown[] | undefined,
  existing: unknown[] | undefined
): unknown[] {
  const existingItems = Array.isArray(existing) ? existing : [];
  const incomingItems = Array.isArray(incoming) ? incoming : [];
  return uniqBy([...existingItems, ...incomingItems], (it: unknown) => {
    if (isPlainObject(it)) {
      return String(
        it["id"] ?? it["uri"] ?? `${String(it["title"] ?? "")}|${String(it["uri"] ?? "")}`
      );
    }
    return "";
  });
}

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

  const key = `user:${email.toLowerCase()}`;

  try {
    const incoming = isPlainObject(payload) ? payload : {};
    const existingRaw = await kv.get(key);
    const existing = isPlainObject(existingRaw) ? existingRaw : {};

    const incomingHistory = incoming["history"] as unknown[] | undefined;
    const incomingRoutes = incoming["savedRoutes"] as unknown[] | undefined;
    const incomingDatabase = incoming["database"] as unknown[] | undefined;
    const incomingMaxRadius = incoming["maxRadius"];
    const existingMaxRadius = existing["maxRadius"];

    const merged: AnyObj = {
      history: mergePlansById(incomingHistory, existing["history"] as unknown[] | undefined),
      savedRoutes: mergePlansById(incomingRoutes, existing["savedRoutes"] as unknown[] | undefined),
      database: mergeDatabase(incomingDatabase, existing["database"] as unknown[] | undefined),
      maxRadius:
        typeof incomingMaxRadius === "number" && typeof existingMaxRadius === "number"
          ? Math.max(incomingMaxRadius, existingMaxRadius)
          : typeof incomingMaxRadius === "number"
          ? incomingMaxRadius
          : existingMaxRadius,
      lastSynced: Date.now(),
    };

    await kv.set(key, merged);
    return res.json({ success: true, lastSynced: merged["lastSynced"], data: merged });
  } catch (error) {
    console.error("Save error:", error);
    return res.status(500).json({ error: "Failed to save user data" });
  }
}
