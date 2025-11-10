// src/components/api.js

// ===== Общие хелперы =====
export function authHeaders(token) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handleJson(r) {
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!r.ok) {
    const msg = body?.detail || body?.message || text || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function jget(url, token) {
  const r = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeaders(token),
      "Accept": "application/json",
    },
  });
  return handleJson(r);
}

export async function jpost(url, data, token) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data ?? {}),
  });
  return handleJson(r);
}

export async function jput(url, data, token) {
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data ?? {}),
  });
  return handleJson(r);
}

// Иногда удобно собрать query-строку
export function withQuery(base, query = {}) {
  const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://local");
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  });
  // Возвращаем только path+search, если base был абсолютным – URL вернётся абсолютный, что тоже ок
  return u.toString();
}

// Отправка form-url-encoded (для /auth/token)
export async function formPost(url, form, token) {
  const fd = new URLSearchParams();
  Object.entries(form || {}).forEach(([k, v]) => fd.append(k, v));
  const r = await fetch(url, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: fd.toString(),
  });
  return handleJson(r);
}

// ===== Аутентификация =====

// Регистрация (экран 1.1)
export async function register(API, data) {
  // data: { identifier: "...", password: "..." }
  return jpost(`${API}/auth/register`, data);
}

// Логин (экран 1)
export async function login(API, identifier, password) {
  // /auth/token ожидает form-data x-www-form-urlencoded
  return formPost(`${API}/auth/token`, {
    username: identifier,
    password,
  });
}

// Текущий пользователь
export async function fetchMe(API, token) {
  return jget(`${API}/auth/me`, token);
}

// ===== Профили (новый флоу) =====

// Экран 3 — список всех профилей пользователя
export async function getProfiles(API, token) {
  return jget(`${API}/api/v1/profiles`, token);
}

// Экран 1.2/1.3 — Personal
export async function createPersonalProfile(API, token, payload) {
  // payload: { first_name, last_name, ssn?, date_of_birth?, phone_number?, contact_email?, mailing_address?, marital_status?, number_of_dependents? }
  return jpost(`${API}/api/v1/profiles/personal`, payload, token);
}

export async function updatePersonalProfile(API, token, profileId, payload) {
  return jput(`${API}/api/v1/profiles/personal/${profileId}`, payload, token);
}

// Экран 1.2 — Business
export async function createBusinessProfile(API, token, payload) {
  // payload: { ein?, business_name, mailing_address?, business_phone?, business_email?, industry_code? }
  return jpost(`${API}/api/v1/profiles/business`, payload, token);
}

// Экран 1.4/1.5 — чек-лист документов
export async function getRequirements(API, token, profileId, profileType /* 'PERSONAL' | 'BUSINESS' */) {
  const type = String(profileType || "").toLowerCase(); // personal | business
  return jget(`${API}/api/v1/profiles/${type}/${profileId}/requirements`, token);
}

// Загрузка файла к конкретному требованию (requirement_id)
export async function uploadToRequirement(API, token, requirementId, file) {
  const fd = new FormData();
  fd.append("file", file);

  // ВАЖНО: не ставим Content-Type вручную — браузер проставит boundary
  const r = await fetch(withQuery(`${API}/api/v1/documents/upload`, { requirement_id: requirementId }), {
    method: "POST",
    headers: authHeaders(token),
    body: fd,
  });
  return handleJson(r);
}

// --- Backward compatibility aliases ---
export async function loginToken(API, identifier, password) {
  // старое имя, проксируем на новый метод
  return login(API, identifier, password);
}
