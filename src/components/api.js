// ==== HTTP helpers & API (согласовано со схемой выше) ====

// Базовый URL можно задать через VITE_API / VITE_API_BASE
export const API_BASE =
  import.meta.env.VITE_API || import.meta.env.VITE_API_BASE || "https://tax-i.onrender.com";

// Заголовки с/без токена
export function authHeaders(token, extra = {}) {
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

// Безопасный JSON
async function safeJson(res) {
  const txt = await res.text();
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return txt; }
}

// Читабельный текст ошибки
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

// ---------------------------------------------------------
// 1) Аутентификация и Пользователи (/auth)
// ---------------------------------------------------------

// Login: POST /auth/token (x-www-form-urlencoded: username, password)
export async function login(API, payload) {
  const base = API || API_BASE;
  const body = new URLSearchParams();
  body.set("username", payload.email);
  body.set("password", payload.password);

  const r = await fetch(`${base}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(errorText(data));
  // ожидаем { access_token, token_type }
  if (!data?.access_token) throw new Error("No access_token in response");
  return data;
}

// Register (driver): POST /auth/register (JSON как в схеме)
export async function register(API, payload) {
  const base = API || API_BASE;
  const body = {
    email: payload.email,
    phone: payload.phone,
    first_name: payload.first_name,
    last_name: payload.last_name,
    patronymic: payload.patronymic,
    password: payload.password,
  };
  const r = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(errorText(data));
  return data; // UserOut
}

// GET /auth/me
export async function fetchMe(API, token) {
  const base = API || API_BASE;
  const r = await fetch(`${base}/auth/me`, { headers: authHeaders(token) });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(errorText(data));
  return data;
}

// ---------------------------------------------------------
// 2) Флоу Водителя (/api/v1)
// ---------------------------------------------------------

// GET /api/v1/periods/status/{driver_user_id}/{year}
export async function periodStatus(API, token, userId, year) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/periods/status/${userId}/${year}`, token);
}

// POST /api/v1/payment/submit-stub/{year}
export async function submitPaymentStub(API, token, year) {
  const base = API || API_BASE;
  // тело пустое; статус/детали возвращаются в ответе
  return jpost(`${base}/api/v1/payment/submit-stub/${year}`, token, null);
}

// ---------------------------------------------------------
// 3) Маркетплейс фирм (/api/v1/firms)
// ---------------------------------------------------------

// GET /api/v1/firms
export async function listFirms(API, token) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/firms`, token);
}

// POST /api/v1/firms/select/{firm_id}
export async function selectFirm(API, token, firmId) {
  const base = API || API_BASE;
  return jpost(`${base}/api/v1/firms/select/${firmId}`, token, null);
}

// GET /api/v1/firms/my-link
export async function getMyFirmLink(API, token) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/firms/my-link`, token);
}

// ---------------------------------------------------------
// 4) Анкета: Personal & Business (/api/v1/profiles, /api/v1/business)
// ---------------------------------------------------------

// Personal profile:
// GET /api/v1/profiles/personal/{user_id}
export async function getPersonal(API, token, userId) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/profiles/personal/${userId}`, token);
}

// PUT /api/v1/profiles/personal/{user_id}
export async function putPersonal(API, token, userId, payload) {
  const base = API || API_BASE;
  return jput(`${base}/api/v1/profiles/personal/${userId}`, token, payload);
}

// Business profiles:
// GET /api/v1/business/profiles/{user_id}
export async function getBusinessProfiles(API, token, userId) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/business/profiles/${userId}`, token);
}

// POST /api/v1/business/profiles
export async function createBusinessProfile(API, token, payload) {
  const base = API || API_BASE;
  return jpost(`${base}/api/v1/business/profiles`, token, payload);
}

// GET /api/v1/business/{business_profile_id}/expenses/{year}
export async function getBusinessExpenses(API, token, businessProfileId, year) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/business/${businessProfileId}/expenses/${year}`, token);
}

// PUT /api/v1/business/{business_profile_id}/expenses/{year}
export async function putBusinessExpenses(API, token, businessProfileId, year, expenses) {
  const base = API || API_BASE;
  return jput(`${base}/api/v1/business/${businessProfileId}/expenses/${year}`, token, { expenses });
}

// ---------------------------------------------------------
// 5) Документы (/api/v1/documents)
// ---------------------------------------------------------

// POST /api/v1/documents/upload/{driver_user_id}?year=YYYY&document_type_code=CODE
export async function uploadDocument(API, token, driverUserId, { year, document_type_code, file }) {
  const base = API || API_BASE;
  const url = withQuery(`${base}/api/v1/documents/upload/${driverUserId}`, {
    year, document_type_code
  });
  const form = new FormData();
  form.append("file", file);
  return formPost(url, token, form);
}

// GET /api/v1/documents/by-driver/{driver_user_id}
export async function listDocumentsByDriver(API, token, driverUserId) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/documents/by-driver/${driverUserId}`, token);
}

// GET /api/v1/documents/download-url/{document_id}
export async function getDocumentDownloadUrl(API, token, documentId) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/documents/download-url/${documentId}`, token);
}

// ---------------------------------------------------------
// 8) Чат (REST)
// ---------------------------------------------------------

// GET /api/v1/chat/history/{driver_user_id}
export async function getChatHistory(API, token, driverUserId) {
  const base = API || API_BASE;
  return jget(`${base}/api/v1/chat/history/${driverUserId}`, token);
}

// Для WebSocket используйте: wss://.../api/v1/chat/ws/{driver_user_id}?token=ACCESS_TOKEN
