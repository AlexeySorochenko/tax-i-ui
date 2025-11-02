// ==== HTTP helpers & API ====

// Можно переопределить базовый URL через переменную окружения
// В проекте также прокидывается API как проп (приоритетнее), но это дефолт.
export const API_BASE =
  import.meta.env.VITE_API || import.meta.env.VITE_API_BASE || "https://tax-i.onrender.com";

// Универсальные заголовки с токеном
export function authHeaders(token, extra = {}) {
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

// Простой safe JSON
async function safeJson(res) {
  const txt = await res.text();
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return txt; }
}

// Красивое сообщение об ошибке
function errorText(payload) {
  if (!payload) return "Request failed";
  if (typeof payload === "string") return payload;
  if (payload.detail) {
    if (Array.isArray(payload.detail)) {
      return payload.detail.map(d => (d.msg || d.message || JSON.stringify(d))).join("; ");
    }
    return payload.detail.msg || payload.detail.message || String(payload.detail);
  }
  if (payload.error) return payload.error;
  return JSON.stringify(payload);
}

// Базовые обёртки
export async function jget(url, token) {
  const r = await fetch(url, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

export async function jpost(url, token, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

export async function jput(url, token, body) {
  const r = await fetch(url, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

export async function jdel(url, token) {
  const r = await fetch(url, { method: "DELETE", headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

// Отправка файлов (FormData)
export async function formPost(url, token, formData) {
  const r = await fetch(url, { method: "POST", headers: authHeaders(token), body: formData });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

// Хелпер для query-параметров
export function withQuery(url, params = {}) {
  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  });
  return u.toString();
}

// ---- Auth ----
export async function fetchMe(API, token) {
  const base = API || API_BASE;
  const r = await fetch(`${base}/auth/me`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // { id, email, ... , role }
}

export async function login(API, payload) {
  const base = API || API_BASE;
  const r = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // { access_token, ... }
}

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

// ---- Персональные данные водителя ----
// Если реальные пути иные — скорректируйте строки ниже по Swagger (/docs#/)
export async function getPersonal(API, token, userId) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/personal/${userId}`, token);
}

export async function putPersonal(API, token, userId, payload) {
  const base = API || API_BASE;
  return jput(`${base}/api/v1/personal/${userId}`, token, payload);
}

// ---- Flow/периоды ----
export async function periodStatus(API, token, userId, year) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/periods/status/${userId}/${year}`, token);
}

// ---- Фирмы ----
export async function listFirms(API, token) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/firms`, token);
}

export async function selectFirm(API, token, firmId) {
  const base = API || API_BASE;
  return jpost(`${base}/api/v1/firms/select/${firmId}`, token);
}

// (добавляйте новые вызовы ниже по мере необходимости)
