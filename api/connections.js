import { randomUUID } from "node:crypto";

const STORE_KEY = "collective:connections:v1";
const MEMBERS = new Set(["Nayel", "Anusha", "Anush", "Rushil"]);

function credentials() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  };
}

async function redis(command) {
  const { url, token } = credentials();
  if (!url || !token) throw new Error("Shared storage is not configured");
  const result = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(10000)
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok || payload.error) throw new Error(payload.error || "Storage request failed");
  return payload.result;
}

async function readJson(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return JSON.parse(raw || "{}");
}

function text(value, limit) {
  return String(value || "").trim().slice(0, limit);
}

function cleanPerson(input) {
  const owners = [...new Set(Array.isArray(input.owners) ? input.owners.filter(owner => MEMBERS.has(owner)) : [])];
  const name = text(input.name, 140);
  const url = text(input.url, 2048);
  if (!name || !owners.length || !/^https?:\/\/(?:[a-z]+\.)?linkedin\.com\/in\//i.test(url)) {
    throw new Error("A name, LinkedIn profile, and valid owner are required");
  }
  return {
    id: `p_${randomUUID()}`,
    name,
    company: text(input.company, 180) || "Independent",
    role: text(input.role, 180) || "Connection",
    location: text(input.location, 180) || "Location not listed",
    photo: text(input.photo, 700000),
    owners,
    note: text(input.note, 3000),
    url,
    added: /^\d{4}-\d{2}-\d{2}$/.test(input.added || "") ? input.added : new Date().toISOString().slice(0, 10)
  };
}

function parsePeople(result) {
  const values = Array.isArray(result)
    ? result.filter((_, index) => index % 2 === 1)
    : Object.values(result || {});
  return values.flatMap(value => {
    try { return [typeof value === "string" ? JSON.parse(value) : value]; }
    catch { return []; }
  }).sort((a, b) => String(b.added).localeCompare(String(a.added)) || String(b.id).localeCompare(String(a.id)));
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  try {
    if (request.method === "GET") {
      return response.status(200).json({ people: parsePeople(await redis(["HGETALL", STORE_KEY])) });
    }
    if (request.method === "POST") {
      const person = cleanPerson(await readJson(request));
      await redis(["HSET", STORE_KEY, person.id, JSON.stringify(person)]);
      return response.status(201).json({ person });
    }
    if (request.method === "DELETE") {
      const id = text(request.query?.id, 100);
      if (!/^p_[a-f0-9-]{36}$/i.test(id)) return response.status(400).json({ error: "Valid connection ID required" });
      await redis(["HDEL", STORE_KEY, id]);
      return response.status(200).json({ removed: id });
    }
    response.setHeader("Allow", "GET, POST, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const unavailable = error.message === "Shared storage is not configured";
    return response.status(unavailable ? 503 : 500).json({ error: error.message || "Connection store failed" });
  }
}
