// ==== HTTP helpers & API ====

// Добавь VITE_API_BASE в .env, если нужно переопределять
export const API_BASE = import.meta.env.VITE_API_BASE || "https://tax-i.onrender.com";

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

// ---- auth ----
export async function fetchMe(API, token) {
  const base = API || API_BASE;
  const r = await fetch(`${base}/auth/me`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // { id, email, first_name, last_name, ... , role }
}

// Расширенная схема регистрации
export async function register(API, payload) {
  const base = API || API_BASE;
  const body = {
    email: payload.email,
    phone: payload.phone,
    first_name: payload.first_name,
    last_name: payload.last_name,
    patronymic: payload.patronymic,
    password: payload.password,
    role: payload.role || "driver",
  };
  const r = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

export async function login(API, { email, password }) {
  const base = API || API_BASE;
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);
  const r = await fetch(`${base}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // { access_token, token_type }
}

// ---- driver flow ----
export async function periodStatus(API, token, userId, year) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/periods/status/${userId}/${year}`, token);
}

export async function listFirms(API, token) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/firms`, token);
}

export async function selectFirm(API, token, firmId) {
  const base = API || API_BASE;
  return jpost(`${base}/api/v1/firms/select/${firmId}`, token);
}

// (при необходимости добавляй и другие вызовы сюда)
