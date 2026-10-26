import { getStore } from "@netlify/blobs";

export const config = { path: "/api/*" };

const db = () => getStore("cravesayz");
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const read = async (k, d) => (await db().get(k, { type: "json" })) ?? d;
const write = (k, v) => db().setJSON(k, v);
const clean = (s, n) => String(s ?? "").trim().slice(0, n);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;

const DEFAULT_QUOTES = [
  "Even the sky changes its mood, so you’re allowed to as well.",
  "Stay soft. The world is loud enough already.",
  "Some feelings are too big for words, so we borrow the clouds.",
  "You’re not behind. You’re just growing at your own horizon.",
  "Let the quiet days teach you what the loud ones can’t.",
  "Look up. There’s always more room than you think.",
];

export default async (req) => {
  const path = new URL(req.url).pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const m = req.method;

  // ---- admin guard ----
  if (path.startsWith("admin")) {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) return json({ error: "Set ADMIN_PASSWORD in your Netlify environment variables." }, 503);
    if (req.headers.get("x-admin-password") !== pw) return json({ error: "Wrong password." }, 401);
  }

  let body = {};
  if (m === "POST" || m === "PUT") {
    try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  }

  // ---- deletes ----
  if (m === "DELETE") {
    const [, kind, key] = path.split("/");
    if (kind === "messages") {
      const l = (await read("messages", [])).filter((x) => x.id !== decodeURIComponent(key));
      await write("messages", l);
      return json({ ok: true });
    }
    if (kind === "subscribers") {
      const l = (await read("subscribers", [])).filter((x) => x.email !== decodeURIComponent(key));
      await write("subscribers", l);
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  }

  switch (`${m} ${path}`) {
    // ---- public ----
    case "GET quotes":
      return json(await read("quotes", DEFAULT_QUOTES));
    case "GET stats":
      return json(await read("stats", { visits: 0, likes: 0 }));
    case "POST visit":
    case "POST like": {
      const s = await read("stats", { visits: 0, likes: 0 });
      s[path === "visit" ? "visits" : "likes"]++;
      await write("stats", s);
      return json(s);
    }
    case "POST contact": {
      if (body.website) return json({ ok: true }); // honeypot for bots
      const msg = {
        id: crypto.randomUUID(),
        name: clean(body.name, 80),
        email: clean(body.email, 120),
        message: clean(body.message, 2000),
        at: new Date().toISOString(),
      };
      if (!msg.name || !msg.message || !emailOk(msg.email)) return json({ error: "Please fill in every field correctly." }, 400);
      const l = await read("messages", []);
      l.unshift(msg);
      await write("messages", l.slice(0, 500));
      return json({ ok: true });
    }
    case "POST subscribe": {
      if (body.website) return json({ ok: true });
      const email = clean(body.email, 120).toLowerCase();
      if (!emailOk(email)) return json({ error: "Please enter a valid email." }, 400);
      const l = await read("subscribers", []);
      if (!l.some((s) => s.email === email)) {
        l.unshift({ email, at: new Date().toISOString() });
        await write("subscribers", l.slice(0, 5000));
      }
      return json({ ok: true });
    }

    // ---- admin ----
    case "POST admin/login":
      return json({ ok: true });
    case "GET admin/data":
      return json({
        stats: await read("stats", { visits: 0, likes: 0 }),
        quotes: await read("quotes", DEFAULT_QUOTES),
        messages: await read("messages", []),
        subscribers: await read("subscribers", []),
      });
    case "PUT admin/quotes": {
      const q = (Array.isArray(body.quotes) ? body.quotes : []).map((x) => clean(x, 300)).filter(Boolean).slice(0, 200);
      await write("quotes", q);
      return json({ ok: true, count: q.length });
    }
  }
  return json({ error: "Not found" }, 404);
};
