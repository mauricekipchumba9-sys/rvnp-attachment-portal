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
/* departments and courses, from the RVNP 2026-2027 brochure (units are added later by the ILO representatives) */
const OTHER = "Other courses";
const CATALOG = {
  "Agriculture and Environmental Studies": [["General Agriculture & Extension",[5,6]],["Agripreneurship Technology",[6]],["Horticulture Farm Technology",[5,6]],["Environmental Technology",[5,6]],["Aquaculture",[6]],["Animal Production",[5,6]],["Animal Health and Production",[5,6]],["General Agriculture",[4]],["Livestock Food Production",[5]],["Sheep Shearing",[3]]],
  "Agricultural and Mechanical Engineering": [["Agricultural Engineering",[6]],["Agriculture Machinery & Equipment",[4]],["Automotive Engineering",[6]],["Automotive Technology",[5,6]],["Welding & Fabrication",[4,5]],["Mechanical Production Technology",[5,6]]],
  "Building and Civil Engineering": [["Masonry",[4]],["Building Technology",[5,6]],["Carpentry & Joinery",[4,5]],["Land Surveying",[5,6]],["Architectural Draftsman",[5]],["Architecture",[6]],["Civil Engineering",[6]],["Quantity Surveying",[6]],["Water Engineering Technology",[6]],["Plumbing",[4,5]],["Road Construction",[5]]],
  "Business Studies": [["Accountancy plus Quickbooks",[6]],["Banking & Finance plus Quickbooks",[6]],["Business Mgt with ICT",[5,6]],["Cooperative Mgt with ICT",[5,6]],["Human Resource Mgt with ICT",[5,6]],["Office Administration (Secretarial) with ICT",[5,6]],["Supply Chain Mgt with ICT",[5,6]],["Store Keeping Mgt with ICT",[5]],["Road Transport Mgt with ICT",[5,6]],["Project Mgt with ICT",[5,6]],["Investment Mgt with ICT",[6]],["Procurement with ICT",[5]]],
  "Electrical and Electronics Engineering": [["Electrical Installation Technology",[4]],["Solar PV System Installation Technology",[4]],["Electrical Engineering Technology",[5,6]],["Telecommunication Engineering Technology",[6]],["Instrumentation & Control Technology",[5,6]]],
  "Health and Applied Sciences": [["Science Laboratory",[5,6]],["Applied Biology",[6]],["Medical Engineering",[6]],["Food Technology",[5,6]],["Petroleum & Geoscience",[5,6]],["Health Records & IT",[5,6]],["Community Health",[5,6]],["Analytical Chemistry",[6]],["Nutrition & Dietetics",[5,6]],["Geophysical Exploration Technology",[5,6]],["Medical Lab",[6]],["Geology Technology",[6]]],
  "Hospitality and Tourism": [["Baking Technology",[5,6]],["Fashion Design",[4,5]],["Fashion Design Mgt",[6]],["Food & Beverage Production (Culinary Arts)",[4,5]],["Food & Beverage Management",[6]],["Hair Dressing",[4,5]],["Beauty Therapy",[4,5]],["Tourism & Travel Mgt",[6]],["Tour Guide Operations",[4,5]],["Catering & Accommodation Operations",[5]],["Catering & Accommodation Mgt",[6]],["Cosmetology",[4,5,6]]],
  "Information Communication Technology": [["Library & Information Service",[5]],["Library & Information Management",[6]],["Computer Science",[6]],["ICT Technician",[5,6]],["Software Developer",[5,6]],["Network System Administrator",[5]],["Network System Technician",[6]]],
  "Liberal Studies": [["Counselling Psychology",[5,6]],["Social Work & Community Development",[5,6]],["Criminal Justice Mgt",[5,6]],["Kenya Sign Language",[4]],["Child Care & Protection",[5,6]]],
};
const DEPTS = Object.keys(CATALOG), ELEC = "Electrical and Electronics Engineering";
const normT = (t) => String(t).toUpperCase().replace(/[^A-Z0-9]/g, "");
function catalogList() {
  const out = []; let d = 0;
  for (const [dept, items] of Object.entries(CATALOG)) {
    d++; let n = 0;
    for (const [name, levels] of items) for (const l of levels) { n++; out.push({ key: "D" + d + "-" + n, dept, title: name.toUpperCase().replace(/\s+/g, " ") + " LEVEL " + l, percent: 0, units: [] }); }
  }
  return out;
}
/* first use: attach departments to the existing courses and add the brochure courses once */
async function loadCourses(s) {
  let c = await getJSON(s, "courses", null);
  if (!(await getJSON(s, "seeded", false))) {
    c = (c || DEFAULT_COURSES).map((x) => ({ ...x }));
    const cat = catalogList(), have = new Map(c.map((x) => [normT(x.title), x]));
    for (const k of cat) { const m = have.get(normT(k.title)); if (m && !m.dept) m.dept = k.dept; }
    for (const x of c) if (!x.dept) x.dept = /ELECTR|TELECOM|INSTRUMENT/.test(x.title) ? ELEC : OTHER;
    for (const k of cat) if (!have.has(normT(k.title))) c.push(k);
    await s.setJSON("courses", c); await s.setJSON("seeded", true);
  }
  return c || DEFAULT_COURSES;
}
function deptList(courses) { return courses.some((c) => c.dept === OTHER) ? [...DEPTS, OTHER] : DEPTS; }
class Bad extends Error {}
/* named policies (a library): each student can be on the default policy, on one of these, or have one-off custom dates */
function cleanPolicies(list) {
  if (!Array.isArray(list)) throw new Bad("Nothing to save.");
  if (list.length > 30) throw new Bad("Too many policies (limit 30).");
  const names = new Set();
  return list.map((x, i) => {
    const name = clean(x.name, 60);
    if (name.length < 2) throw new Bad("Policy " + (i + 1) + " needs a name, e.g. \"Policy 2 - January intake\".");
    if (names.has(name.toLowerCase())) throw new Bad("Two policies are called \"" + name + "\". Give each its own name.");
    names.add(name.toLowerCase());
    let v;
    try { v = cleanSettings(x); } catch (e) { throw new Bad(name + ": " + e.message); }
    const id = /^P[a-z0-9]{3,20}$/.test(clean(x.id, 30)) ? x.id : "P" + Date.now().toString(36) + i;
    return { id, name, ...v };
  });
}
function effective(rec, settings, policies) {
  const pol = rec.pid && policies.find((x) => x.id === rec.pid);
  const b = pol || settings;
  return { n: rec.n, a: rec.a, c: rec.c, p: rec.p || b.policyNumber, i: rec.i || b.issueDate, s: rec.s || b.policyStart, e: rec.e || b.policyEnd, ins: b.insurer };
}
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
    const dept = DEPTS.includes(c.dept) || c.dept === OTHER ? c.dept : OTHER;
    let key = clean(c.key, 30).replace(/[^A-Za-z0-9_-]/g, "") || "C" + Date.now().toString(36) + i;
    while (seen.has(key)) key += "x";
    seen.add(key);
    return { key, title, dept, percent, units };
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
      const courses = await loadCourses(s);
      return json({ courses, departments: deptList(courses), nita: await getJSON(s, "nitameta", null) });
    }
    if (method === "GET" && path === "nita") {
      const f = await getJSON(s, "nitafile", null), m = await getJSON(s, "nitameta", null);
      if (!f || !m) return fail("The NITA form has not been uploaded yet.", 404);
      return new Response(Buffer.from(f.data, "base64"), { headers: { "Content-Type": m.type || "application/octet-stream", "Content-Disposition": 'attachment; filename="' + m.name.replace(/[^A-Za-z0-9._ -]/g, "_") + '"', "Cache-Control": "no-store" } });
    }
    if (method === "POST" && path === "ilo") {
      const courses = await loadCourses(s);
      const key = clean(body.key, 30), rep = clean(body.rep, 80), phone = clean(body.phone, 30);
      const percent = Number(body.percent);
      const units = (Array.isArray(body.units) ? body.units : String(body.units || "").split("\n")).map((u) => clean(u, 120)).filter(Boolean).slice(0, 60);
      if (rep.length < 3) throw new Bad("Enter your name.");
      if (!(percent >= 0 && percent <= 100) || body.percent === "" || body.percent == null) throw new Bad("Enter the coursework covered so far, between 0 and 100.");
      if (!units.length) throw new Bad("Add at least one unit.");
      let title, dept, newTitle = "";
      if (key) {
        const c = courses.find((x) => x.key === key);
        if (!c) throw new Bad("That course was not found. Refresh the page and try again.");
        title = c.title; dept = c.dept;
      } else {
        newTitle = clean(body.newTitle, 120).toUpperCase(); dept = clean(body.dept, 80);
        if (newTitle.length < 3) throw new Bad("Choose a course, or type the name of the course (with its level).");
        if (!DEPTS.includes(dept)) throw new Bad("Choose the department.");
        title = newTitle;
      }
      const all = await getJSON(s, "ilo", {});
      if (Object.keys(all).length >= 500) throw new Bad("Too many waiting submissions. Please contact the Industrial Liaison Office.");
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      all[id] = { key, newTitle, title, dept, percent, units, rep, phone, t: Date.now() };
      await s.setJSON("ilo", all);
      return json({ ok: true });
    }
    if (method === "POST" && path === "lookup") {
      const name = clean(body.name), adm = clean(body.adm, 60);
      if (name.length < 3 || adm.length < 6) return json({ found: false });
      const students = await getJSON(s, "students", {});
      const rec = students[sid(name, adm)];
      if (!rec) return json({ found: false });
      const settings = await getJSON(s, "settings", DEFAULT_SETTINGS);
      return json({ found: true, record: effective(rec, settings, await getJSON(s, "policies", [])), settings });
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
        out.push({ rank, n: r.n, r });
      }
      out.sort((x, y) => x.rank - y.rank || x.n.localeCompare(y.n));
      const settings = await getJSON(s, "settings", DEFAULT_SETTINGS), pols = await getJSON(s, "policies", []);
      return json({ matches: out.slice(0, 8).map((o) => effective(o.r, settings, pols)), settings });
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
          courses: await loadCourses(s),
          departments: DEPTS.concat(OTHER),
          policies: await getJSON(s, "policies", []),
          nita: await getJSON(s, "nitameta", null),
          ilo: Object.entries(await getJSON(s, "ilo", {})).map(([id, r]) => ({ id, ...r })).sort((x, y) => (x.t || 0) - (y.t || 0)),
          students: Object.entries(students).map(([id, r]) => ({ id, ...r })),
          requests: Object.entries(await getJSON(s, "requests", {})).map(([id, r]) => ({ id, ...r })).sort((x, y) => (x.t || 0) - (y.t || 0)),
        });
      }
      if (method === "PUT" && path === "admin/settings") {
        const v = cleanSettings(body); await s.setJSON("settings", v); return json({ settings: v });
      }
      if (method === "PUT" && path === "admin/policies") {
        const v = cleanPolicies(body.policies); await s.setJSON("policies", v);
        return json({ policies: v });
      }
      if (method === "POST" && path === "admin/assign") {
        const policies = await getJSON(s, "policies", []), pid = clean(body.pid, 30);
        if (pid && !policies.some((x) => x.id === pid)) throw new Bad("That policy no longer exists. Refresh and try again.");
        const cur = await getJSON(s, "students", {});
        const cls = clean(body.c, 40), ids = Array.isArray(body.ids) ? body.ids.map((x) => clean(x, 200)) : [];
        if (!cls && !ids.length) throw new Bad("Choose a class or some students.");
        let assigned = 0;
        for (const [id, r] of Object.entries(cur)) {
          if (!(cls ? r.c === cls : ids.includes(id))) continue;
          cur[id] = { n: r.n, a: r.a, c: r.c, ...(pid && { pid }) };
          assigned++;
        }
        if (!assigned) throw new Bad("No students matched.");
        await s.setJSON("students", cur);
        return json({ assigned, students: Object.entries(cur).map(([id, r]) => ({ id, ...r })) });
      }
      if (method === "POST" && path === "admin/ilo/approve") {
        const all = await getJSON(s, "ilo", {}), sub = all[clean(body.id, 40)];
        if (!sub) throw new Bad("That submission is no longer in the list. Refresh and try again.");
        const courses = await loadCourses(s);
        let c = sub.key ? courses.find((x) => x.key === sub.key) : courses.find((x) => normT(x.title) === normT(sub.title));
        if (c) { c.percent = sub.percent; c.units = sub.units; }
        else courses.push({ key: "C" + Date.now().toString(36), title: sub.title, dept: sub.dept, percent: sub.percent, units: sub.units });
        delete all[clean(body.id, 40)];
        await s.setJSON("courses", courses); await s.setJSON("ilo", all);
        return json({ courses, ilo: Object.entries(all).map(([id, r]) => ({ id, ...r })) });
      }
      if (method === "DELETE" && path.startsWith("admin/ilo/")) {
        const all = await getJSON(s, "ilo", {}); delete all[path.split("/")[2]]; await s.setJSON("ilo", all);
        return json({ total: Object.keys(all).length });
      }
      if (method === "POST" && path === "admin/nita") {
        const name = clean(body.name, 100), data = String(body.data || "");
        if (!/\.(pdf|docx?|jpe?g|png)$/i.test(name)) throw new Bad("Upload the NITA form as a PDF, Word document or image.");
        if (!data || data.length > 5500000) throw new Bad("The file is empty or too large. Keep it under 4 MB.");
        const meta = { name, type: clean(body.type, 80) || "application/octet-stream", t: Date.now() };
        await s.setJSON("nitafile", { data }); await s.setJSON("nitameta", meta);
        return json({ nita: meta });
      }
      if (method === "DELETE" && path === "admin/nita") {
        await s.setJSON("nitafile", {}); await s.setJSON("nitameta", null);
        return json({ nita: null });
      }
      if (method === "PUT" && path === "admin/courses") {
        const v = cleanCourses(body.courses); await s.setJSON("courses", v); await s.setJSON("seeded", true); return json({ courses: v });
      }
      if (method === "POST" && path === "admin/students") {
        const rows = Array.isArray(body.rows) ? body.rows : [];
        const cur = body.mode === "replace" ? {} : await getJSON(s, "students", {});
        const settings = await getJSON(s, "settings", DEFAULT_SETTINGS);
        const policies = await getJSON(s, "policies", []);
        let added = 0, updated = 0, skipped = 0, unknownPolicy = 0;
        for (const r of rows) {
          const n = clean(r.n, 120).toUpperCase(), a = clean(r.a, 60).toUpperCase().replace(/\s+/g, ""), c = clean(r.c, 40);
          if (n.length < 3 || a.length < 4) { skipped++; continue; }
          const id = sid(n, a);
          let ov;
          try { ov = policyOverrides(r, settings); } catch { skipped++; continue; }
          const keep = cur[id] || {};
          let pid = keep.pid || "";
          const pname = clean(r.pol, 60).toLowerCase();
          if (pname && !/^(default|none)$/.test(pname)) {
            const m = policies.find((x) => x.name.toLowerCase() === pname);
            if (!m) { skipped++; unknownPolicy++; continue; }
            pid = m.id;
          } else if (/^(default|none)$/.test(pname)) pid = "";
          cur[id] ? updated++ : added++;
          const keepOv = { ...(keep.p && { p: keep.p }), ...(keep.i && { i: keep.i }), ...(keep.s && { s: keep.s }), ...(keep.e && { e: keep.e }) };
          cur[id] = { n, a, c, ...(pid && { pid }), ...(Object.keys(ov).length ? ov : keepOv) };
        }
        await s.setJSON("students", cur);
        /* requests that now have a cover on file are done */
        const reqs = await getJSON(s, "requests", {});
        let cleared = 0;
        for (const id of Object.keys(reqs)) if (cur[id]) { delete reqs[id]; cleared++; }
        if (cleared) await s.setJSON("requests", reqs);
        return json({ added, updated, skipped, unknownPolicy, cleared, total: Object.keys(cur).length });
      }
      if (method === "POST" && path === "admin/approve") {
        const settings = await getJSON(s, "settings", DEFAULT_SETTINGS);
        const reqs = await getJSON(s, "requests", {});
        const cur = await getJSON(s, "students", {});
        const ids = body.all ? Object.keys(reqs) : [clean(body.id, 200)];
        let approved = 0;
        const policies = await getJSON(s, "policies", []), pid = clean(body.pid, 30);
        if (pid && !policies.some((x) => x.id === pid)) throw new Bad("That policy no longer exists. Refresh and try again.");
        const ov = body.all || pid ? {} : policyOverrides(body, settings);
        for (const id of ids) {
          const r = reqs[id]; if (!r) continue;
          cur[id] = { n: r.n, a: r.a, c: r.c, ...(pid && { pid }), ...ov };
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
        const policies = await getJSON(s, "policies", []), pid = clean(body.pid, 30);
        if (pid && !policies.some((x) => x.id === pid)) throw new Bad("That policy no longer exists. Refresh and try again.");
        const ov = pid ? {} : policyOverrides(body, settings);
        cur[id] = { n: cur[id].n, a: cur[id].a, c: cur[id].c, ...(pid && { pid }), ...ov };
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
