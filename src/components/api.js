// src/components/api.js

// ========= базовые хелперы =========
export function authHeaders(token) {
  const h = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function baseFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg;
    try { msg = await res.json(); } catch { msg = await res.text(); }
    throw new Error(typeof msg === "string" ? msg : (msg?.detail || JSON.stringify(msg)));
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function jget(url, token) {
  return baseFetch(url, { headers: { ...authHeaders(token) } });
}

export async function jpost(url, body, token) {
  return baseFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body ?? {})
  });
}

export async function jput(url, body, token) {
  return baseFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body ?? {})
  });
}

// ========= auth =========
export async function register(API, { identifier, password }) {
  return jpost(`${API}/auth/register`, { identifier, password });
}

export async function login(API, identifier, password) {
  const body = new URLSearchParams();
  body.set("username", identifier);
  body.set("password", password);
  const res = await fetch(`${API}/auth/token`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { access_token, token_type }
}

export async function fetchMe(API, token) {
  return jget(`${API}/auth/me`, token);
}

// ========= profiles (новая схема) =========
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

export async function getRequirements(API, token, profileId, profileType /* 'PERSONAL'|'BUSINESS' */) {
  const t = profileType.toLowerCase(); // personal | business
  return jget(`${API}/api/v1/profiles/${t}/${profileId}/requirements`, token);
}

export async function uploadToRequirement(API, token, requirementId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/api/v1/documents/upload?requirement_id=${encodeURIComponent(requirementId)}`, {
    method: "POST",
    headers: { ...authHeaders(token) }, // без Content-Type — пусть браузер поставит boundary
    body: fd
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
