// API helpers (mobile-friendly, with 401 handling hook-in point)

export function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function handle(r) {
  if (r.status === 401) {
    localStorage.removeItem("access_token");
    throw new Error("Unauthorized");
  }
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function jget(url, token) {
  const r = await fetch(url, { headers: authHeaders(token) });
  return handle(r);
}

export async function jpost(url, token, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  return handle(r);
}

export async function jput(url, token, body) {
  const r = await fetch(url, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  });
  return handle(r);
}

export async function formPost(url, token, formData) {
  const r = await fetch(url, { method: "POST", headers: authHeaders(token), body: formData });
  return handle(r);
}

export async function fetchMe(API, token) {
  const r = await fetch(`${API}/auth/me`, { headers: authHeaders(token) });
  return handle(r); // { id, email, name, role }
}

/* ---- New flows ---- */

// Firms marketplace
export const listFirms = (API, token) => jget(`${API}/api/v1/firms`, token);
export const selectFirm = (API, token, firmId) => jpost(`${API}/api/v1/firms/select/${firmId}`, token);

// Personal profile
export const getPersonal = (API, token, userId) => jget(`${API}/api/v1/profiles/personal/${userId}`, token);
export const putPersonal = (API, token, userId, payload) => jput(`${API}/api/v1/profiles/personal/${userId}`, token, payload);

// Periods & checklist
export const periodStatus = (API, token, userId, year) => jget(`${API}/api/v1/periods/status/${userId}/${year}`, token);

// Documents
export const docsByDriver = (API, token, userId) => jget(`${API}/api/v1/documents/by-driver/${userId}`, token);
export const uploadDoc = (API, token, userId, year, code, file) => {
  const url = `${API}/api/v1/documents/upload/${userId}?year=${encodeURIComponent(year)}&document_type_code=${encodeURIComponent(code)}`;
  const fd = new FormData();
  fd.append("file", file);
  return formPost(url, token, fd);
};

// Business profiles & expenses
export const listBusinessProfiles = (API, token, userId) => jget(`${API}/api/v1/business/profiles/${userId}`, token);
export const createBusinessProfile = (API, token, payload) => jpost(`${API}/api/v1/business/profiles`, token, payload);
export const businessProfileDetails = (API, token, profileId) => jget(`${API}/api/v1/business/profiles/${profileId}`, token);
export const getExpenses = (API, token, profileId, year) => jget(`${API}/api/v1/business/${profileId}/expenses/${year}`, token);
export const saveExpenses = (API, token, profileId, year, expenses) =>
  jput(`${API}/api/v1/business/${profileId}/expenses/${year}`, token, { expenses });

// Accountant dashboard
export const accountantDashboard = (API, token, year) => jget(`${API}/api/v1/accountant/dashboard?year=${year}`, token);
export const accountantInviteLink = (API, token) => jget(`${API}/api/v1/accountant/invite-link`, token);

// Chat
export const chatHistory = (API, token, driverId) => jget(`${API}/api/v1/chat/history/${driverId}`, token);
export const chatSocketUrl = (API, token, driverId) => `${API.replace("https://", "wss://").replace("http://","ws://")}/api/v1/chat/ws/${driverId}?token=${encodeURIComponent(token)}`;
