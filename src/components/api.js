// Lightweight HTTP helpers + auth API

// ---------- common ----------
export function authHeaders(token, extra = {}) {
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

async function safeJson(res) {
  const txt = await res.text();
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return txt; }
}

function errorText(payload) {
  if (!payload) return "Request failed";
  if (typeof payload === "string") return payload;
  if (payload.detail) {
    const d = payload.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map(x => x.msg || JSON.stringify(x)).join("; ");
    return JSON.stringify(d);
  }
  return JSON.stringify(payload);
}

export async function jget(url, token) {
  const r = await fetch(url, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

export async function jpost(url, token, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: body == null ? null : JSON.stringify(body),
  });
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

export async function formPost(url, token, formData) {
  const r = await fetch(url, { method: "POST", headers: authHeaders(token), body: formData });
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

// ---------- auth ----------
export async function fetchMe(API, token) {
  const r = await fetch(`${API}/auth/me`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // { id, email, name, role }
}

export async function register(API, { email, name, password, role = "driver" }) {
  const r = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password, role }),
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // created user
}

export async function login(API, { email, password }) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  const r = await fetch(`${API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // { access_token, token_type }
}

// ---------- (если дальше используешь) ----------
export async function periodStatus(API, token, userId, year) {
  return jget(`${API}/api/v1/periods/status/${userId}/${year}`, token);
}
export async function listFirms(API, token) {
  return jget(`${API}/api/v1/firms`, token);
}
export async function selectFirm(API, token, firmId) {
  return jpost(`${API}/api/v1/firms/select/${firmId}`, token);
}
export async function getExpenses(API, token, businessProfileId, year) {
  return jget(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`, token);
}
export async function saveExpenses(API, token, businessProfileId, year, expensesArray) {
  return jpost(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`, token, { expenses: expensesArray });
}
