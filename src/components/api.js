// Unified auth header
export function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

// ---- safe JSON parser (handles 204 / empty body)
async function safeJson(res) {
  if (res.status === 204) return null;
  const text = await res.text();          // don't double-read body elsewhere
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function jget(url, token) {
  const r = await fetch(url, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(await r.text());
  return safeJson(r);
}

export async function jpost(url, token, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(await r.text());
  return safeJson(r);
}

export async function jput(url, token, body) {
  const r = await fetch(url, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(await r.text());
  return safeJson(r); // может вернуть null при 204 — это нормально
}

export async function formPost(url, token, formData) {
  const r = await fetch(url, { method: "POST", headers: authHeaders(token), body: formData });
  if (!r.ok) throw new Error(await r.text());
  return safeJson(r);
}

// ---- domain helpers (используются драйверским флоу)

export async function fetchMe(API, token) {
  const r = await fetch(`${API}/auth/me`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(await r.text());
  return safeJson(r); // { id, email, name, role }
}

// Period status (source of truth)
export const periodStatus = (API, token, userId, year) =>
  jget(`${API}/api/v1/periods/status/${userId}/${year}`, token);

// Firms
export const listFirms   = (API, token) => jget(`${API}/api/v1/firms`, token);
export const selectFirm  = (API, token, firmId) => jpost(`${API}/api/v1/firms/select/${firmId}`, token);

// Business profiles
export const listBusinessProfiles = (API, token, userId) =>
  jget(`${API}/api/v1/business/profiles/${userId}`, token);

export const createBusinessProfile = (API, token, payload) =>
  jpost(`${API}/api/v1/business/profiles`, token, payload);

// Expenses
export const getExpenses = (API, token, businessProfileId, year) =>
  jget(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`, token);

export const saveExpenses = (API, token, businessProfileId, year, items) =>
  jput(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`, token, { expenses: items });

// Documents
export const docsByDriver = (API, token, driverId) =>
  jget(`${API}/api/v1/documents/by-driver/${driverId}`, token);

export async function uploadDoc(API, token, driverId, year, code, file) {
  const form = new FormData();
  form.append("file", file);
  const url = `${API}/api/v1/documents/upload/${driverId}?year=${year}&document_type_code=${encodeURIComponent(code)}`;
  return formPost(url, token, form);
}

// Payment stub
export const submitPaymentStub = (API, token, year) =>
  jpost(`${API}/api/v1/payment/submit-stub/${year}`, token, {});
