import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-a65fd448/health", (c) => c.json({ status: "ok" }));

// ── LIST all psychologists (public: only approved; admin: all) ──
app.get("/make-server-a65fd448/psychologists", async (c) => {
  const adminMode = c.req.query("admin") === "true";
  const all = await kv.getByPrefix("psych:");
  const list = adminMode ? all : all.filter((p: any) => p.approved);
  list.sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return c.json(list);
});

// ── GET single psychologist ──
app.get("/make-server-a65fd448/psychologists/:id", async (c) => {
  const data = await kv.get(`psych:${c.req.param("id")}`);
  if (!data) return c.json({ error: "Not found" }, 404);
  return c.json(data);
});

// ── CREATE psychologist ──
app.post("/make-server-a65fd448/psychologists", async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const profile = {
    id,
    name: body.name ?? "",
    title: body.title ?? "Psicólogo(a)",
    location: body.location ?? "",
    flag: body.flag ?? "🇧🇷",
    specialties: body.specialties ?? [],
    approach: body.approach ?? "",
    sessions: body.sessions ?? "Online · Português",
    photo_url: body.photo_url ?? "",
    years: Number(body.years) || 1,
    rating: Number(body.rating) || 5.0,
    approved: body.approved ?? false,
    crp: body.crp ?? "",
    email: body.email ?? "",
    created_at: new Date().toISOString(),
  };
  await kv.set(`psych:${id}`, profile);
  return c.json(profile, 201);
});

// ── UPDATE psychologist ──
app.put("/make-server-a65fd448/psychologists/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`psych:${id}`);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json();
  const updated = {
    ...existing,
    ...body,
    id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };
  await kv.set(`psych:${id}`, updated);
  return c.json(updated);
});

// ── TOGGLE approval ──
app.patch("/make-server-a65fd448/psychologists/:id/approve", async (c) => {
  const id = c.req.param("id");
  const existing = await kv.get(`psych:${id}`);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const updated = { ...existing, approved: !existing.approved };
  await kv.set(`psych:${id}`, updated);
  return c.json(updated);
});

// ── DELETE psychologist ──
app.delete("/make-server-a65fd448/psychologists/:id", async (c) => {
  const id = c.req.param("id");
  await kv.del(`psych:${id}`);
  return c.json({ success: true });
});

Deno.serve(app.fetch);
