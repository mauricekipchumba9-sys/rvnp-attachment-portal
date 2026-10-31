// RVNP Attachment Portal API (Netlify Function + Netlify Blobs)
// Env var required: ADMIN_PASSWORD
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const config = { path: "/api/*" };

/* ---------- storage ---------- */
async function store() {
  if (globalThis.__TEST_STORE__) return globalThis.__TEST_STORE__;
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "rvnp-portal", consistency: "strong" });
}

const DEFAULT_SETTINGS = {
  policyNumber: "25/50/NKR/002276/07",
  insurer: "First Assurance Company Ltd",
  policyStart: "2026-07-13",
  policyEnd: "2027-07-12",
  issueDate: "2026-07-13",
};
const E = ["Install Conduit System","Install PVC Sheathed Cable System","Install Trunking System","Install Stand-Alone Solar PV Systems","Perform Bell and Alarm Installation","Wind Electrical Machine","Apply Basic Electrical Principles","Apply Digital Literacy","Perform Electrical Installation","Prepare Technical Drawings","Apply Analogue Electronics I","Apply Digital Electronics I","Apply Engineering Technician Mathematics 1","Apply Work Ethics and Practices","Perform Security System Installation","Apply Analogue Electronics II","Apply Digital Electronics II","Apply Engineering Technician Mathematics II","Apply Entrepreneurial Skills","Install Solar PV Systems","Perform Electrical Machine Installation"];
const T = ["Apply Digital Skills","Install Electrical Systems","Prepare Engineering Drawings","Apply Engineering Technician Mathematics","Install Specialized Power Systems","Apply Electrical Principles","Apply Work Ethics and Practices","Install Computer Network","Apply Communication Skills","Apply Entrepreneurial Skills","Fabricate Electronic Circuits","Apply Telecommunication Principles","Fabricate Embedded and RF Circuits"];
const EN = "ELECTRICAL ENGINEERING TECHNOLOGY LEVEL ", TN = "TELECOMMUNICATION TECHNOLOGY LEVEL ";
const DEFAULT_COURSES = [
  { key: "E4", title: EN + "4", percent: 100, units: E.slice(0, 6) },
  { key: "E5", title: EN + "5", percent: 100, units: E },
  { key: "E6", title: EN + "6", percent: 75, units: E },
  { key: "T6", title: TN + "6", percent: 75, units: T },
];

async function getJSON(s, key, fallback) {
  const v = await s.get(key, { type: "json" });
  return v ?? fallback;
}

/* ---------- matching (same rules as the original portal) ---------- */
const normAdm = (a) => String(a).toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^L4EI/, "EIL4");
const normName = (n) =>
  String(n).toUpperCase().replace(/[`'\u2019]/g, "").replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/).filter(Boolean).sort().join(" ");
const sid = (name, adm) =>
  createHash("sha256").update(normAdm(adm) + "|" + normName(name)).digest("hex").slice(0, 32);
const clean = (v, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/* ---------- auth ---------- */
const secret = () => {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("ADMIN_PASSWORD is not set");
  return createHmac("sha256", "rvnp-admin-v3").update(p).digest();
};
const b64 = (b) => Buffer.from(b).toString("base64url");
function makeToken() {
  const body = b64(JSON.stringify({ exp: Date.now() + 12 * 3600 * 1000 }));
  return body + "." + b64(createHmac("sha256", secret()).update(body).digest());
}
function validToken(t) {
  try {
    const [body, sig] = String(t).split(".");
    const good = createHmac("sha256", secret()).update(body).digest();
    const got = Buffer.from(sig, "base64url");
    if (got.length !== good.length || !timingSafeEqual(got, good)) return false;
    return JSON.parse(Buffer.from(body, "base64url").toString()).exp > Date.now();
  } catch { return false; }
}
function samePassword(input) {
  const a = createHash("sha256").update(String(input)).digest();
  const b = createHash("sha256").update(String(process.env.ADMIN_PASSWORD || "\u0000none")).digest();
  return timingSafeEqual(a, b) && !!process.env.ADMIN_PASSWORD;
}

/* ---------- validation ---------- */
class Bad extends Error {}
/* optional per-student policy details: policy number p, issue date i, start s, expiry e (blank = use the defaults) */
function pdate(v) {
  v = clean(v, 40); if (!v) return "";
  let y, m, d, x;
  if ((x = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else if ((x = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) { d = +x[1]; m = +x[2]; y = +x[3]; }
  else { const t = new Date(v); if (isNaN(t)) throw new Bad("Could not read the date \"" + v + "\". Use day/month/year, e.g. 13/07/2026."); y = t.getFullYear(); m = t.getMonth() + 1; d = t.getDate(); }
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) throw new Bad("\"" + v + "\" is not a real date.");
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function policyOverrides(o, settings) {
  const out = {}, p = clean(o.p, 60), i = pdate(o.i), st = pdate(o.s), e = pdate(o.e);
  if (p) out.p = p; if (i) out.i = i; if (st) out.s = st; if (e) out.e = e;
  const a = out.s || settings.policyStart, b = out.e || settings.policyEnd;
  if (b < a) throw new Bad("The expiry date is before the start date.");
  return out;
}
function cleanSettings(x) {
  const o = {
    policyNumber: clean(x.policyNumber, 60), insurer: clean(x.insurer, 80),
    policyStart: clean(x.policyStart, 10), policyEnd: clean(x.policyEnd, 10), issueDate: clean(x.issueDate, 10),
  };
  if (!o.policyNumber || !o.insurer) throw new Bad("Policy number and insurer are required.");
  for (const k of ["policyStart", "policyEnd", "issueDate"])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o[k]) || isNaN(Date.parse(o[k]))) throw new Bad("Enter a valid date for " + k + ".");
  if (o.policyEnd < o.policyStart) throw new Bad("Policy end date is before the start date.");
  return o;
}
function cleanCourses(list) {
  if (!Array.isArray(list) || !list.length) throw new Bad("Add at least one course.");
  const seen = new Set();
  return list.map((c, i) => {
    const title = clean(c.title, 120).toUpperCase();
    if (!title) throw new Bad("Course " + (i + 1) + " needs a title.");
    const percent = Number(c.percent);
    if (!(percent >= 0 && percent <= 100)) throw new Bad(title + ": coursework covered must be between 0 and 100.");
    const units = (Array.isArray(c.units) ? c.units : []).map((u) => clean(u, 120)).filter(Boolean);
    if (!units.length) throw new Bad(title + ": add at least one unit.");
    let key = clean(c.key, 30).replace(/[^A-Za-z0-9_-]/g, "") || "C" + Date.now().toString(36) + i;
    while (seen.has(key)) key += "x";
    seen.add(key);
    return { key, title, percent, units };
  });
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const fail = (msg, status = 400) => json({ error: msg }, status);

export default async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    const method = req.method;
    const s = await store();
    const body = ["POST", "PUT"].includes(method) ? await req.json().catch(() => ({})) : {};

    /* ----- public ----- */
    if (method === "GET" && path === "courses") {
      return json({ courses: await getJSON(s, "courses", DEFAULT_COURSES) });
    }
    if (method === "POST" && path === "lookup") {
      const name = clean(body.name), adm = clean(body.adm, 60);
      if (name.length < 3 || adm.length < 6) return json({ found: false });
      const students = await getJSON(s, "students", {});
      const rec = students[sid(name, adm)];
      if (!rec) return json({ found: false });
      return json({ found: true, record: rec, settings: await getJSON(s, "settings", DEFAULT_SETTINGS) });
    }

    if (method === "POST" && path === "search") {
      const q = clean(body.q, 60).toUpperCase();
      const compact = q.replace(/[^A-Z0-9]/g, "");
      if (compact.length < 3) return json({ matches: [] });
      const qAdm = normAdm(q), words = q.replace(/[`'\u2019]/g, "").replace(/[^A-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
      const students = await getJSON(s, "students", {});
      const out = [];
      for (const r of Object.values(students)) {
        const nm = String(r.n).toUpperCase().replace(/[`'\u2019]/g, "").replace(/[^A-Z0-9\s]/g, " ");
        const adm = normAdm(r.a);
        const byAdm = qAdm.length >= 3 && adm.includes(qAdm);
        const byName = words.length > 0 && words.every((w) => nm.includes(w));
        if (!byAdm && !byName) continue;
        const rank = (adm.startsWith(qAdm) || nm.startsWith(words[0] || "~")) ? 0 : 1;
        out.push({ rank, n: r.n, a: r.a, c: r.c, p: r.p, i: r.i, s: r.s, e: r.e });
      }
      out.sort((x, y) => x.rank - y.rank || x.n.localeCompare(y.n));
      return json({ matches: out.slice(0, 8).map(({ rank, ...r }) => r), settings: await getJSON(s, "settings", DEFAULT_SETTINGS) });
    }

    if (method === "POST" && path === "request") {
      const n = clean(body.name, 120).toUpperCase(), a = clean(body.adm, 60).toUpperCase().replace(/\s+/g, ""),
        c = clean(body.cls, 40).toUpperCase(), course = clean(body.course, 120).toUpperCase();
      if (n.length < 3 || a.length < 4 || c.length < 2 || course.length < 2) return fail("Fill in your full name, class, course and admission number.");
      const id = sid(n, a);
      const students = await getJSON(s, "students", {});
      if (students[id]) return json({ ok: true, already: true });
      const reqs = await getJSON(s, "requests", {});
      if (!reqs[id] && Object.keys(reqs).length >= 5000) return fail("Requests are full right now. Please see the Industrial Liaison Office.");
      reqs[id] = { n, a, c, course, t: Date.now() };
      await s.setJSON("requests", reqs);
      return json({ ok: true });
    }

    /* ----- admin login ----- */
    if (method === "POST" && path === "login") {
      if (!samePassword(body.password)) { await new Promise((r) => setTimeout(r, 800)); return fail("Wrong password.", 401); }
      return json({ token: makeToken() });
    }

    /* ----- admin (token required) ----- */
    if (path.startsWith("admin")) {
      const t = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
      if (!validToken(t)) return fail("Please sign in again.", 401);

      if (method === "GET" && path === "admin/data") {
        const students = await getJSON(s, "students", {});
        return json({
          settings: await getJSON(s, "settings", DEFAULT_SETTINGS),
          courses: await getJSON(s, "courses", DEFAULT_COURSES),
          students: Object.entries(students).map(([id, r]) => ({ id, ...r })),
          requests: Object.entries(await getJSON(s, "requests", {})).map(([id, r]) => ({ id, ...r })).sort((x, y) => (x.t || 0) - (y.t || 0)),
        });
      }
      if (method === "PUT" && path === "admin/settings") {
        const v = cleanSettings(body); await s.setJSON("settings", v); return json({ settings: v });
      }
      if (method === "PUT" && path === "admin/courses") {
        const v = cleanCourses(body.courses); await s.setJSON("courses", v); return json({ courses: v });
      }
      if (method === "POST" && path === "admin/students") {
        const rows = Array.isArray(body.rows) ? body.rows : [];
        const cur = body.mode === "replace" ? {} : await getJSON(s, "students", {});
        const settings = await getJSON(s, "settings", DEFAULT_SETTINGS);
        let added = 0, updated = 0, skipped = 0;
        for (const r of rows) {
          const n = clean(r.n, 120).toUpperCase(), a = clean(r.a, 60).toUpperCase().replace(/\s+/g, ""), c = clean(r.c, 40);
          if (n.length < 3 || a.length < 4) { skipped++; continue; }
          const id = sid(n, a);
          let ov;
          try { ov = policyOverrides(r, settings); } catch { skipped++; continue; }
          const keep = cur[id] || {};
          cur[id] ? updated++ : added++;
          cur[id] = { n, a, c, ...(Object.keys(ov).length ? ov : { ...(keep.p && { p: keep.p }), ...(keep.i && { i: keep.i }), ...(keep.s && { s: keep.s }), ...(keep.e && { e: keep.e }) }) };
        }
        await s.setJSON("students", cur);
        /* requests that now have a cover on file are done */
        const reqs = await getJSON(s, "requests", {});
        let cleared = 0;
        for (const id of Object.keys(reqs)) if (cur[id]) { delete reqs[id]; cleared++; }
        if (cleared) await s.setJSON("requests", reqs);
        return json({ added, updated, skipped, cleared, total: Object.keys(cur).length });
      }
      if (method === "POST" && path === "admin/approve") {
        const settings = await getJSON(s, "settings", DEFAULT_SETTINGS);
        const reqs = await getJSON(s, "requests", {});
        const cur = await getJSON(s, "students", {});
        const ids = body.all ? Object.keys(reqs) : [clean(body.id, 200)];
        let approved = 0;
        const ov = body.all ? {} : policyOverrides(body, settings);
        for (const id of ids) {
          const r = reqs[id]; if (!r) continue;
          cur[id] = { n: r.n, a: r.a, c: r.c, ...ov };
          delete reqs[id]; approved++;
        }
        if (!approved) throw new Bad("That request is no longer in the list. Refresh and try again.");
        await s.setJSON("students", cur); await s.setJSON("requests", reqs);
        return json({ approved, total: Object.keys(cur).length, requests: Object.keys(reqs).length });
      }
      if (method === "PUT" && path.startsWith("admin/students/")) {
        const id = path.split("/")[2];
        const settings = await getJSON(s, "settings", DEFAULT_SETTINGS);
        const cur = await getJSON(s, "students", {});
        if (!cur[id]) throw new Bad("Student not found. Refresh and try again.");
        const ov = policyOverrides(body, settings);
        cur[id] = { n: cur[id].n, a: cur[id].a, c: cur[id].c, ...ov };
        await s.setJSON("students", cur);
        return json({ student: { id, ...cur[id] } });
      }
      if (method === "DELETE" && (path === "admin/requests" || path.startsWith("admin/requests/"))) {
        const id = path.split("/")[2];
        const reqs = id ? await getJSON(s, "requests", {}) : {};
        if (id) delete reqs[id];
        await s.setJSON("requests", reqs);
        return json({ total: Object.keys(reqs).length });
      }
      if (method === "DELETE" && path.startsWith("admin/students/")) {
        const id = path.split("/")[2];
        const cur = await getJSON(s, "students", {});
        delete cur[id];
        await s.setJSON("students", cur);
        return json({ total: Object.keys(cur).length });
      }
    }
    return fail("Not found", 404);
  } catch (e) {
    return e instanceof Bad ? fail(e.message, 400) : fail("Server error. " + (e.message || ""), 500);
  }
};
