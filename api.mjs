// RVNP Attachment Portal API (Netlify Function + Netlify Blobs)
// Env var required: ADMIN_PASSWORD
import { createHash, createHmac, timingSafeEqual, randomBytes, scryptSync } from "node:crypto";

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


/* ---------- placements (students report where they were attached) and trainers (assigned by the ILO HOD) ---------- */
const cleanPhone = (v) => String(v || "").replace(/[^\d+]/g, "").slice(0, 16);
const digits = (v) => String(v || "").replace(/\D/g, "").length;
const sameStr = (a, b) => timingSafeEqual(createHash("sha256").update(String(a)).digest(), createHash("sha256").update(String(b)).digest());
/* the secret behind the HOD link: created on first use, can be replaced from the admin page */
async function hodKey(s) {
  let k = await getJSON(s, "hodkey", null);
  if (!k || !k.key) { k = { key: randomBytes(18).toString("base64url"), t: Date.now() }; await s.setJSON("hodkey", k); }
  return k.key;
}
async function hodOk(req, s) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (bearer && validToken(bearer)) return true; /* the admin can always use the HOD tools */
  const k = req.headers.get("x-hod-key") || "";
  return !!k && sameStr(k, await hodKey(s));
}
function cleanPlacement(b) {
  const n = clean(b.name, 120).toUpperCase(), a = clean(b.adm, 60).toUpperCase().replace(/\s+/g, ""),
    dept = clean(b.dept, 80), course = clean(b.course, 120).toUpperCase(),
    p1 = cleanPhone(b.p1), p2 = cleanPhone(b.p2),
    org = clean(b.org, 120).toUpperCase(), desc = clean(b.desc, 300), sup = clean(b.sup, 100).toUpperCase(), town = clean(b.town, 60).toUpperCase();
  if (n.length < 3) throw new Bad("Enter your full name.");
  if (a.length < 6) throw new Bad("Enter your full admission number.");
  if (!DEPTS.includes(dept) && dept !== OTHER) throw new Bad("Choose your department.");
  if (course.length < 3) throw new Bad("Choose your course.");
  if (digits(p1) < 9) throw new Bad("Enter phone number 1 with at least 9 digits.");
  if (p2 && digits(p2) < 9) throw new Bad("Phone number 2 must have at least 9 digits, or leave it empty.");
  if (org.length < 3) throw new Bad("Enter the name of the organization.");
  if (desc.length < 5) throw new Bad("Describe where the organization is, for example: near Nakuru Level 5 Hospital.");
  if (sup.length < 3) throw new Bad("Enter the name of your supervisor at the organization.");
  if (town.length < 2) throw new Bad("Enter the town.");
  return { n, a, dept, course, p1, p2, org, desc, sup, town };
}
const pubTrainer = (list, tid) => { const t = tid && list.find((x) => x.id === tid); return t ? { name: t.name, phone: t.phone } : null; };


/* ---------- marks (private to each student), ILO representative access and official notices ---------- */
const stuSecret = () => {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("ADMIN_PASSWORD is not set");
  return createHmac("sha256", "rvnp-student-v1").update(p).digest();
};
/* a student's sign-in token only carries that one student's id and lasts 2 hours */
function makeStuToken(id) {
  const body = b64(JSON.stringify({ id, exp: Date.now() + 2 * 3600 * 1000 }));
  return body + "." + b64(createHmac("sha256", stuSecret()).update(body).digest());
}
function stuFromToken(t) {
  try {
    const [body, sig] = String(t).split(".");
    const good = createHmac("sha256", stuSecret()).update(body).digest(), got = Buffer.from(sig, "base64url");
    if (got.length !== good.length || !timingSafeEqual(got, good)) return null;
    const o = JSON.parse(Buffer.from(body, "base64url").toString());
    return o.exp > Date.now() && typeof o.id === "string" ? o.id : null;
  } catch { return null; }
}
const hashPin = (pin, salt) => scryptSync(String(pin), salt, 32).toString("hex");
const last9 = (v) => String(v || "").replace(/\D/g, "").slice(-9);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function del(s, key) { try { await s.delete(key); } catch {} }
/* five wrong PINs lock that student's sign-in for 15 minutes */
async function lockCheck(s, id) {
  const l = await getJSON(s, "lk/" + id, null);
  if (l && l.until && l.until > Date.now()) throw new Bad("Too many wrong attempts. Try again in " + Math.ceil((l.until - Date.now()) / 60000) + " minutes, or ask the Industrial Liaison Office to help.");
}
async function lockFail(s, id) {
  let l = (await getJSON(s, "lk/" + id, null)) || { f: 0 };
  if (l.until && l.until <= Date.now()) l = { f: 0 };
  l.f = (l.f || 0) + 1;
  if (l.f >= 5) l = { f: 0, until: Date.now() + 15 * 60000 };
  await s.setJSON("lk/" + id, l);
  await pause(600);
}
const isAdmin = (req) => validToken((req.headers.get("authorization") || "").replace(/^Bearer /, ""));
const ILO_ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
async function iloCode(s, renew) {
  let k = await getJSON(s, "ilokey", null);
  if (renew || !k || !k.key) { k = { key: Array.from(randomBytes(8), (b) => ILO_ALPHA[b % ILO_ALPHA.length]).join(""), t: Date.now() }; await s.setJSON("ilokey", k); }
  return k.key;
}
async function iloOk(req, s) {
  if (isAdmin(req)) return true;
  const k = req.headers.get("x-ilo-key") || "";
  return !!k && sameStr(k.trim().toLowerCase(), await iloCode(s));
}
const iloName = (req) => {
  if (isAdmin(req)) return "Admin";
  let n = req.headers.get("x-ilo-name") || "";
  try { n = decodeURIComponent(n); } catch {}
  return clean(n.replace(/[^\x20-\x7E]/g, ""), 60) || "ILO representative";
};
async function marksOpen(s) { const v = await getJSON(s, "marksopen", { open: true }); return v.open !== false; }
/* every student on the register or the cover list, by id */
async function everyone(s) {
  const reg = await getJSON(s, "register", {}), st = await getJSON(s, "students", {}), all = new Map();
  for (const [id, r] of Object.entries(st)) all.set(id, { id, n: r.n, a: r.a, c: r.c });
  for (const [id, r] of Object.entries(reg)) all.set(id, { id, n: r.n, a: r.a, c: r.c, tel: r.tel });
  return all;
}
async function findPeople(s, qraw) {
  const q = clean(qraw, 60).toUpperCase(), compact = q.replace(/[^A-Z0-9]/g, "");
  if (compact.length < 3) return [];
  const qAdm = normAdm(q), words = q.replace(/[`'\u2019]/g, "").replace(/[^A-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const idx = await getJSON(s, "midx", {}), out = [];
  for (const r of (await everyone(s)).values()) {
    const nm = String(r.n).toUpperCase().replace(/[`'\u2019]/g, "").replace(/[^A-Z0-9\s]/g, " "), adm = normAdm(r.a);
    const byAdm = qAdm.length >= 3 && adm.includes(qAdm), byName = words.length > 0 && words.every((w) => nm.includes(w));
    if (!byAdm && !byName) continue;
    out.push({ rank: (adm.startsWith(qAdm) || nm.startsWith(words[0] || "~")) ? 0 : 1, id: r.id, n: r.n, a: r.a, c: r.c, k: (idx[r.id] || {}).k || 0 });
  }
  out.sort((x, y) => x.rank - y.rank || x.n.localeCompare(y.n));
  return out.slice(0, 10).map(({ rank, ...o }) => o);
}
function cleanMark(b) {
  const unit = clean(b.unit, 120), assess = clean(b.assess, 60), note = clean(b.note, 200);
  const out = b.out === "" || b.out == null ? 100 : Number(b.out), score = Number(b.score);
  if (unit.length < 2) throw new Bad("Enter the unit or subject.");
  if (assess.length < 1) throw new Bad("Enter the assessment, for example CAT 1.");
  if (!(out > 0 && out <= 1000)) throw new Bad("\"Out of\" must be a number from 1 to 1000.");
  if (b.score === "" || b.score == null || !(score >= 0 && score <= out)) throw new Bad("The mark must be a number from 0 to " + out + ".");
  return { unit, assess, score: Math.round(score * 100) / 100, out, note };
}
async function saveIdx(s, id, p, items) {
  const idx = await getJSON(s, "midx", {});
  if (items.length) idx[id] = { n: p.n, a: p.a, c: p.c, k: items.length, u: Date.now() }; else delete idx[id];
  await s.setJSON("midx", idx);
}
const NOTICE_AUD = ["all", "students", "reps"];
const pubNotice = (x) => ({ id: x.id, title: x.title, body: x.body, imp: !!x.imp, from: x.from, t: x.t });

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
    if (method === "GET" && path === "register-info") {
      const students = await getJSON(s, "students", {}), reg = await getJSON(s, "register", {});
      const set = new Set();
      for (const r of [...Object.values(students), ...Object.values(reg)]) if (r.c) set.add(r.c);
      return json({ classes: [...set].sort() });
    }
    if (method === "POST" && path === "register") {
      const n = clean(body.name, 120).toUpperCase(), a = clean(body.adm, 60).toUpperCase().replace(/\s+/g, ""),
        c = clean(body.cls, 40).toUpperCase().replace(/\s+/g, ""), tel = String(body.tel || "").replace(/[^\d+]/g, "").slice(0, 16);
      if (n.length < 3) throw new Bad("Enter your full name.");
      if (a.length < 6) throw new Bad("Enter your full admission number.");
      if (c.length < 2) throw new Bad("Enter your class.");
      if (tel.replace(/\D/g, "").length < 9) throw new Bad("Enter a contact number with at least 9 digits.");
      const reg = await getJSON(s, "register", {}), id = sid(n, a), updated = !!reg[id];
      if (!updated && Object.keys(reg).length >= 20000) throw new Bad("The list is full. Please contact the Industrial Liaison Office.");
      reg[id] = { n, a, c, tel, t: updated ? reg[id].t : Date.now(), u: Date.now() };
      await s.setJSON("register", reg);
      return json({ ok: true, updated });
    }
    if (method === "GET" && path === "ilo-info") {
      const students = await getJSON(s, "students", {}), rules = await getJSON(s, "classpol", {});
      const cnt = {};
      for (const r of Object.values(students)) cnt[r.c] = (cnt[r.c] || 0) + 1;
      const settings = await getJSON(s, "settings", DEFAULT_SETTINGS);
      return json({
        classes: Object.keys(cnt).filter(Boolean).sort().map((c) => ({ c, n: cnt[c], pid: rules[c] || "" })),
        policies: await getJSON(s, "policies", []),
        def: settings,
      });
    }
    if (method === "POST" && path === "ilo-policy") {
      const cls = clean(body.cls, 40), rep = clean(body.rep, 80), phone = clean(body.phone, 30), choice = clean(body.choice, 30);
      if (rep.length < 3) throw new Bad("Enter your name.");
      if (cls.length < 2) throw new Bad("Choose the class.");
      const policies = await getJSON(s, "policies", []);
      const sub = { kind: "policy", cls, pid: "", newPolicy: null, rep, phone, t: Date.now() };
      if (choice === "new") {
        try { const v = cleanSettings(body.np || {}); sub.newPolicy = v; } catch (e) { throw new Bad("Policy details: " + e.message); }
      } else if (choice && choice !== "default") {
        if (!policies.some((x) => x.id === choice)) throw new Bad("That policy was not found. Refresh the page and try again.");
        sub.pid = choice;
      } else if (choice !== "default") throw new Bad("Choose which insurance policy the class uses.");
      const all = await getJSON(s, "ilo", {});
      if (Object.keys(all).length >= 500) throw new Bad("Too many waiting submissions. Please contact the Industrial Liaison Office.");
      all[Date.now().toString(36) + Math.random().toString(36).slice(2, 6)] = sub;
      await s.setJSON("ilo", all);
      return json({ ok: true });
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

    /* ----- placements: public side ----- */
    if (method === "POST" && path === "placement") {
      const v = cleanPlacement(body), id = sid(v.n, v.a);
      const all = await getJSON(s, "placements", {}), old = all[id];
      if (!old && Object.keys(all).length >= 20000) throw new Bad("The list is full. Please contact the Industrial Liaison Office.");
      const moved = !!old && (old.org !== v.org || old.town !== v.town);
      const rec = { ...v, t: old ? old.t : Date.now(), u: Date.now() };
      if (old && old.tid && !moved) rec.tid = old.tid; /* a changed organization or town needs a fresh assignment */
      all[id] = rec; await s.setJSON("placements", all);
      return json({ ok: true, updated: !!old, reset: !!(old && old.tid && moved), trainer: pubTrainer(await getJSON(s, "trainers", []), rec.tid) });
    }
    if (method === "POST" && path === "placement-status") {
      const name = clean(body.name), adm = clean(body.adm, 60);
      if (name.length < 3 || adm.length < 6) return json({ found: false });
      const rec = (await getJSON(s, "placements", {}))[sid(name, adm)];
      if (!rec) return json({ found: false });
      const { tid, t, u, ...mine } = rec;
      return json({ found: true, placement: mine, trainer: pubTrainer(await getJSON(s, "trainers", []), tid) });
    }


    /* ----- official notices: public list for students, posting by the HOD / deputy HOD (and the admin) ----- */
    if (method === "GET" && path === "notices") {
      return json({ notices: (await getJSON(s, "notices", [])).filter((x) => x.aud === "all" || x.aud === "students").map(pubNotice) });
    }
    if (path === "hod/notices" || path.startsWith("hod/notices/")) {
      if (!(await hodOk(req, s))) { await pause(600); return fail("This link is not valid. Ask the Industrial Liaison Office for a new one.", 401); }
      const adm = isAdmin(req);
      if (method === "GET") return json({ notices: await getJSON(s, "notices", []), admin: adm });
      if (method === "POST") {
        const title = clean(body.title, 120), text = String(body.body || "").replace(/\r/g, "").trim().slice(0, 2000);
        const aud = NOTICE_AUD.includes(body.aud) ? body.aud : "all";
        if (title.length < 3) throw new Bad("Enter a title for the notice.");
        if (text.length < 3) throw new Bad("Write the message.");
        const from = clean(body.from, 60) || (adm ? "Industrial Liaison Office" : "ILO HOD / Deputy HOD");
        const list = await getJSON(s, "notices", []);
        list.unshift({ id: "N" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title, body: text, aud, imp: !!body.imp, from, role: adm ? "admin" : "hod", t: Date.now() });
        await s.setJSON("notices", list.slice(0, 300));
        return json({ notices: list.slice(0, 300), admin: adm });
      }
      if (method === "DELETE") {
        const id = path.split("/")[2], list = await getJSON(s, "notices", []), n = list.find((x) => x.id === id);
        if (!n) throw new Bad("That notice is no longer in the list. Refresh and try again.");
        if (!adm && n.role === "admin") throw new Bad("Only the admin can remove notices posted by the admin.");
        const rest = list.filter((x) => x.id !== id);
        await s.setJSON("notices", rest);
        return json({ notices: rest, admin: adm });
      }
      return fail("Not found", 404);
    }

    /* ----- student marks: a student can only ever read the record their own sign-in token names ----- */
    if (method === "POST" && path === "marks/setup") {
      const name = clean(body.name), adm = clean(body.adm, 60), pin = String(body.pin || ""), id = sid(name, adm);
      if (name.length < 3 || adm.length < 6) throw new Bad("Enter your full name and admission number.");
      if (!/^\d{5,8}$/.test(pin)) throw new Bad("Choose a PIN of 5 to 8 digits (numbers only).");
      await lockCheck(s, id);
      const r = (await getJSON(s, "register", {}))[id];
      if (!r || last9(r.tel).length < 9 || last9(r.tel) !== last9(body.tel)) {
        await lockFail(s, id);
        throw new Bad("We could not confirm these details. Use the same name, admission number and phone number you gave on the student details form. If you have not filled that form, do it first.");
      }
      if (await getJSON(s, "pin/" + id, null)) throw new Bad("A PIN has already been created for you. Use \"View my marks\" with your PIN. If you forgot it, ask the Industrial Liaison Office to reset it.");
      const salt = randomBytes(8).toString("hex");
      await s.setJSON("pin/" + id, { salt, h: hashPin(pin, salt), t: Date.now() });
      await del(s, "lk/" + id);
      return json({ token: makeStuToken(id) });
    }
    if (method === "POST" && path === "marks/login") {
      const name = clean(body.name), adm = clean(body.adm, 60), id = sid(name, adm);
      if (name.length < 3 || adm.length < 6 || !body.pin) throw new Bad("Enter your full name, admission number and PIN.");
      await lockCheck(s, id);
      const rec = await getJSON(s, "pin/" + id, null);
      const ok = !!rec && sameStr(hashPin(String(body.pin), rec.salt), rec.h);
      if (!ok) { await lockFail(s, id); throw new Bad("Name, admission number or PIN is not right. First time here? Create your PIN."); }
      await del(s, "lk/" + id);
      return json({ token: makeStuToken(id) });
    }
    if (method === "GET" && path === "marks/me") {
      const id = stuFromToken(req.headers.get("x-student-token") || "");
      if (!id) return fail("Please sign in again.", 401);
      if (!(await marksOpen(s))) return json({ closed: true });
      const p = (await everyone(s)).get(id);
      if (!p) return fail("Your record was not found. See the Industrial Liaison Office.", 404);
      const m = await getJSON(s, "m/" + id, { items: [] });
      return json({ student: { n: p.n, a: p.a, c: p.c }, items: m.items.map(({ unit, assess, score, out, note, t }) => ({ unit, assess, score, out, note, t })) });
    }

    /* ----- ILO representatives (access code) and the admin: enter and correct marks ----- */
    if (path.startsWith("ilo/")) {
      if (!(await iloOk(req, s))) { await pause(700); return fail("That access code is not right. Ask the Industrial Liaison Office for the current code.", 401); }
      const parts = path.split("/");
      if (method === "GET" && path === "ilo/check") return json({ ok: true, open: await marksOpen(s) });
      if (path === "ilo/notices" || path.startsWith("ilo/notices/")) {
        const who = iloName(req), adm = isAdmin(req), list = await getJSON(s, "notices", []);
        const mine = (x) => x.role === "rep" && x.by === who;
        const view = (l) => l.filter((x) => x.aud === "all" || x.aud === "reps" || mine(x)).map((x) => ({ ...pubNotice(x), aud: x.aud, mine: adm || mine(x) }));
        if (method === "GET") return json({ notices: view(list) });
        if (method === "POST") {
          const title = clean(body.title, 120), text = String(body.body || "").replace(/\r/g, "").trim().slice(0, 2000);
          const aud = NOTICE_AUD.includes(body.aud) ? body.aud : "all";
          if (title.length < 3) throw new Bad("Enter a title for the notice.");
          if (text.length < 3) throw new Bad("Write the message.");
          if (!adm && list.filter(mine).length >= 30) throw new Bad("You already have 30 notices posted. Delete some old ones first.");
          list.unshift({ id: "N" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title, body: text, aud, imp: !!body.imp,
            from: adm ? "Industrial Liaison Office" : who + ", ILO representative", role: adm ? "admin" : "rep", by: who, t: Date.now() });
          const keep = list.slice(0, 300);
          await s.setJSON("notices", keep);
          return json({ notices: view(keep) });
        }
        if (method === "DELETE") {
          const id = path.split("/")[2], n = list.find((x) => x.id === id);
          if (!n) throw new Bad("That notice is no longer in the list. Refresh and try again.");
          if (!adm && !mine(n)) throw new Bad("You can delete only the notices you posted.");
          const rest = list.filter((x) => x.id !== id);
          await s.setJSON("notices", rest);
          return json({ notices: view(rest) });
        }
      }
      if (method === "POST" && path === "ilo/marks-search") return json({ matches: await findPeople(s, body.q) });
      if (parts[1] === "marks" && parts[2]) {
        const id = clean(parts[2], 64), p = (await everyone(s)).get(id);
        if (!p) throw new Bad("That student was not found. Search again.");
        const m = await getJSON(s, "m/" + id, { items: [] });
        if (method === "GET") return json({ student: { id, n: p.n, a: p.a, c: p.c }, items: m.items, hasPin: !!(await getJSON(s, "pin/" + id, null)) });
        if (method === "POST") {
          const v = cleanMark(body), by = iloName(req), now = Date.now();
          let it = body.itemId ? m.items.find((x) => x.id === body.itemId) : null;
          if (body.itemId && !it) throw new Bad("That mark is no longer there. Refresh and try again.");
          let replaced = false;
          if (!it) { it = m.items.find((x) => x.unit.toLowerCase() === v.unit.toLowerCase() && x.assess.toLowerCase() === v.assess.toLowerCase()); replaced = !!it; }
          if (it) Object.assign(it, v, { by, t: now });
          else { if (m.items.length >= 200) throw new Bad("This student already has 200 marks."); m.items.push({ id: "M" + now.toString(36) + Math.random().toString(36).slice(2, 5), ...v, by, t: now }); }
          await s.setJSON("m/" + id, m); await saveIdx(s, id, p, m.items);
          return json({ items: m.items, replaced });
        }
        if (method === "DELETE" && parts[3]) {
          m.items = m.items.filter((x) => x.id !== parts[3]);
          await s.setJSON("m/" + id, m); await saveIdx(s, id, p, m.items);
          return json({ items: m.items });
        }
      }
      return fail("Not found", 404);
    }

    /* ----- ILO HOD / deputy HOD: reached through the secret link (or with the admin sign-in) ----- */
    if (path.startsWith("hod/")) {
      if (!(await hodOk(req, s))) { await new Promise((r) => setTimeout(r, 600)); return fail("This link is not valid. Ask the Industrial Liaison Office for a new one.", 401); }
      if (method === "GET" && path === "hod/data") {
        const pl = await getJSON(s, "placements", {});
        return json({
          placements: Object.entries(pl).map(([id, r]) => ({ id, ...r })).sort((x, y) => (x.dept + x.course + x.n).localeCompare(y.dept + y.course + y.n)),
          trainers: await getJSON(s, "trainers", []),
          departments: DEPTS.concat(OTHER),
        });
      }
      if (method === "POST" && path === "hod/trainers") {
        const name = clean(body.name, 100).toUpperCase(), phone = cleanPhone(body.phone);
        if (name.length < 3) throw new Bad("Enter the trainer's name.");
        if (digits(phone) < 9) throw new Bad("Enter the trainer's phone number (at least 9 digits).");
        const list = await getJSON(s, "trainers", []);
        if (list.length >= 300) throw new Bad("Too many trainers (limit 300).");
        if (list.some((x) => x.name === name && x.phone === phone)) throw new Bad("This trainer is already in the list.");
        list.push({ id: "T" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, phone });
        await s.setJSON("trainers", list);
        return json({ trainers: list });
      }
      if (method === "PUT" && path.startsWith("hod/trainers/")) {
        const id = path.split("/")[2], list = await getJSON(s, "trainers", []), t = list.find((x) => x.id === id);
        if (!t) throw new Bad("Trainer not found. Refresh and try again.");
        const name = clean(body.name, 100).toUpperCase(), phone = cleanPhone(body.phone);
        if (name.length < 3) throw new Bad("Enter the trainer's name.");
        if (digits(phone) < 9) throw new Bad("Enter the trainer's phone number (at least 9 digits).");
        t.name = name; t.phone = phone;
        await s.setJSON("trainers", list);
        return json({ trainers: list });
      }
      if (method === "DELETE" && path.startsWith("hod/trainers/")) {
        const id = path.split("/")[2], list = (await getJSON(s, "trainers", [])).filter((x) => x.id !== id);
        const pl = await getJSON(s, "placements", {});
        let freed = 0;
        for (const r of Object.values(pl)) if (r.tid === id) { delete r.tid; freed++; }
        await s.setJSON("trainers", list); if (freed) await s.setJSON("placements", pl);
        return json({ trainers: list, freed });
      }
      if (method === "POST" && path === "hod/assign") {
        const tid = clean(body.tid, 40), ids = (Array.isArray(body.ids) ? body.ids : []).map((x) => clean(x, 64)).slice(0, 5000);
        if (!ids.length) throw new Bad("Select at least one student.");
        if (tid && !(await getJSON(s, "trainers", [])).some((x) => x.id === tid)) throw new Bad("That trainer no longer exists. Refresh and try again.");
        const pl = await getJSON(s, "placements", {});
        let n = 0;
        for (const id of ids) { const r = pl[id]; if (!r) continue; if (tid) r.tid = tid; else delete r.tid; n++; }
        if (!n) throw new Bad("Those students are no longer in the list. Refresh and try again.");
        await s.setJSON("placements", pl);
        return json({ assigned: n });
      }
      return fail("Not found", 404);
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


      if (method === "GET" && path === "admin/marks-info") {
        const idx = await getJSON(s, "midx", {}), by = {};
        let entries = 0;
        for (const r of Object.values(idx)) { const c = r.c || "-"; by[c] = by[c] || { c, students: 0, entries: 0 }; by[c].students++; by[c].entries += r.k; entries += r.k; }
        return json({ open: await marksOpen(s), code: await iloCode(s), students: Object.keys(idx).length, entries, classes: Object.values(by).sort((x, y) => x.c.localeCompare(y.c)) });
      }
      if (method === "PUT" && path === "admin/marks-open") { await s.setJSON("marksopen", { open: !!body.open }); return json({ open: !!body.open }); }
      if (method === "POST" && path === "admin/ilo-code") return json({ code: await iloCode(s, true) });
      if (method === "POST" && path === "admin/pin-reset") {
        const id = clean(body.id, 64);
        if (!(await everyone(s)).has(id)) throw new Bad("That student was not found.");
        await del(s, "pin/" + id); await del(s, "lk/" + id);
        return json({ ok: true });
      }
      if (method === "GET" && path === "admin/hod-link") return json({ key: await hodKey(s) });
      if (method === "POST" && path === "admin/hod-link") {
        const k = { key: randomBytes(18).toString("base64url"), t: Date.now() }; await s.setJSON("hodkey", k); return json({ key: k.key });
      }
      if (method === "DELETE" && path.startsWith("admin/placements/")) {
        const pl = await getJSON(s, "placements", {}); delete pl[path.split("/")[2]]; await s.setJSON("placements", pl);
        return json({ total: Object.keys(pl).length });
      }
      if (method === "GET" && path === "admin/data") {
        const students = await getJSON(s, "students", {});
        return json({
          settings: await getJSON(s, "settings", DEFAULT_SETTINGS),
          courses: await loadCourses(s),
          departments: DEPTS.concat(OTHER),
          policies: await getJSON(s, "policies", []),
          classpol: await getJSON(s, "classpol", {}),
          nita: await getJSON(s, "nitameta", null),
          ilo: Object.entries(await getJSON(s, "ilo", {})).map(([id, r]) => ({ id, ...r })).sort((x, y) => (x.t || 0) - (y.t || 0)),
          students: Object.entries(students).map(([id, r]) => ({ id, ...r })),
          requests: Object.entries(await getJSON(s, "requests", {})).map(([id, r]) => ({ id, ...r })).sort((x, y) => (x.t || 0) - (y.t || 0)),
        });
      }
      if (method === "PUT" && path === "admin/settings") {
        const v = cleanSettings(body); await s.setJSON("settings", v); return json({ settings: v });
      }
      if (method === "GET" && path === "admin/register") {
        const reg = await getJSON(s, "register", {}), students = await getJSON(s, "students", {});
        const list = Object.entries(reg).map(([id, r]) => ({ id, ...r, cover: !!students[id] })).sort((x, y) => (x.c + x.n).localeCompare(y.c + y.n));
        return json({ list });
      }
      if (method === "DELETE" && path.startsWith("admin/register/")) {
        const reg = await getJSON(s, "register", {}); delete reg[path.split("/")[2]]; await s.setJSON("register", reg);
        return json({ total: Object.keys(reg).length });
      }
      if (method === "PUT" && path === "admin/policies") {
        const v = cleanPolicies(body.policies); await s.setJSON("policies", v);
        const rules = await getJSON(s, "classpol", {});
        for (const c of Object.keys(rules)) if (!v.some((x) => x.id === rules[c])) delete rules[c];
        await s.setJSON("classpol", rules);
        return json({ policies: v, classpol: rules });
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
        const rules = await getJSON(s, "classpol", {});
        if (cls) { if (pid) rules[cls] = pid; else delete rules[cls]; await s.setJSON("classpol", rules); }
        return json({ assigned, classpol: rules, students: Object.entries(cur).map(([id, r]) => ({ id, ...r })) });
      }
      if (method === "POST" && path === "admin/ilo/approve") {
        const all = await getJSON(s, "ilo", {}), sub = all[clean(body.id, 40)];
        if (!sub) throw new Bad("That submission is no longer in the list. Refresh and try again.");
        if (sub.kind === "policy") {
          const settings = await getJSON(s, "settings", DEFAULT_SETTINGS), policies = await getJSON(s, "policies", []);
          const cur = await getJSON(s, "students", {}), rules = await getJSON(s, "classpol", {});
          let pid = sub.pid || "";
          const np = sub.newPolicy;
          if (np) {
            const same = (x, y) => x.policyNumber === y.policyNumber && x.policyStart === y.policyStart && x.policyEnd === y.policyEnd && x.issueDate === y.issueDate;
            if (same(np, settings)) pid = "";
            else {
              let m = policies.find((x) => same(x, np));
              if (!m) {
                let name = np.policyNumber, k = 2;
                while (policies.some((x) => x.name.toLowerCase() === name.toLowerCase())) name = np.policyNumber + " (" + k++ + ")";
                m = { id: "P" + Date.now().toString(36) + "n", name, ...np }; policies.push(m);
              }
              pid = m.id;
            }
          } else if (pid && !policies.some((x) => x.id === pid)) throw new Bad("The policy chosen in this submission has since been removed. Reject it and ask the representative to send it again.");
          let assigned = 0;
          for (const [id, r] of Object.entries(cur)) if (r.c === sub.cls) { cur[id] = { n: r.n, a: r.a, c: r.c, ...(pid && { pid }) }; assigned++; }
          if (pid) rules[sub.cls] = pid; else delete rules[sub.cls];
          delete all[clean(body.id, 40)];
          await s.setJSON("policies", policies); await s.setJSON("students", cur); await s.setJSON("classpol", rules); await s.setJSON("ilo", all);
          return json({ assigned, policies, classpol: rules, students: Object.entries(cur).map(([id, r]) => ({ id, ...r })), ilo: Object.entries(all).map(([id, r]) => ({ id, ...r })) });
        }
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
        const policies = await getJSON(s, "policies", []), rules = await getJSON(s, "classpol", {});
        let added = 0, updated = 0, skipped = 0, unknownPolicy = 0;
        for (const r of rows) {
          const n = clean(r.n, 120).toUpperCase(), a = clean(r.a, 60).toUpperCase().replace(/\s+/g, ""), c = clean(r.c, 40);
          if (n.length < 3 || a.length < 4) { skipped++; continue; }
          const id = sid(n, a);
          let ov;
          try { ov = policyOverrides(r, settings); } catch { skipped++; continue; }
          const keep = cur[id] || {};
          let pid = keep.pid || (cur[id] || Object.keys(ov).length ? "" : (rules[c] && policies.some((x) => x.id === rules[c]) ? rules[c] : ""));
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
        const policies = await getJSON(s, "policies", []), rules = await getJSON(s, "classpol", {});
        const explicit = body.pid !== undefined && body.pid !== "auto", pidIn = clean(body.pid === "auto" ? "" : body.pid, 30);
        if (pidIn && !policies.some((x) => x.id === pidIn)) throw new Bad("That policy no longer exists. Refresh and try again.");
        const ov = body.all || explicit ? {} : policyOverrides(body, settings);
        for (const id of ids) {
          const r = reqs[id]; if (!r) continue;
          const pid = explicit ? pidIn : (Object.keys(ov).length ? "" : (rules[r.c] && policies.some((x) => x.id === rules[r.c]) ? rules[r.c] : ""));
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
