// src/components/api.js
export function authHeaders(token) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function _json(r) {
  if (r.status === 204) return null;
  const txt = await r.text();
  try { return JSON.parse(txt || "null"); } catch { throw new Error(txt || r.statusText); }
}

export async function jget(url, token) {
  const r = await fetch(url, { headers: { ...authHeaders(token) } });
  if (!r.ok) throw new Error(await r.text());
  return _json(r);
}

export async function jpost(url, body, token) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(await r.text());
  return _json(r);
}

export async function jput(url, body, token) {
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(await r.text());
  return _json(r);
}

// ---- AUTH ----
export async function register(API, { identifier, password }) {
  return jpost(`${API}/auth/register`, { identifier, password });
}

export async function loginToken(API, identifier, password) {
  const fd = new URLSearchParams();
  fd.set("username", identifier);
  fd.set("password", password);
  fd.set("grant_type", "");
  const r = await fetch(`${API}/auth/token`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return _json(r); // { access_token }
}

export async function getMe(API, token) {
  return jget(`${API}/auth/me`, token);
}

// ---- PROFILES (новая схема) ----
export async function getProfiles(API, token) {
  return jget(`${API}/api/v1/profiles`, token);
}
export async function createPersonalProfile(API, token, payload) {
  return jpost(`${API}/api/v1/profiles/personal`, payload, token);
}
export async function updatePersonalProfile(API, token, id, payload) {
  return jput(`${API}/api/v1/profiles/personal/${id}`, payload, token);
}
export async function createBusinessProfile(API, token, payload) {
  return jpost(`${API}/api/v1/profiles/business`, payload, token);
}
export async function getRequirements(API, token, profileId, type /* 'personal'|'business' */) {
  return jget(`${API}/api/v1/profiles/${type}/${profileId}/requirements`, token);
}
export async function uploadToRequirement(API, token, requirementId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/api/v1/documents/upload?requirement_id=${requirementId}`, {
    method: "POST",
    headers: { ...authHeaders(token) }, // без Content-Type
    body: fd
  });
  if (!r.ok) throw new Error(await r.text());
  return _json(r);
}
