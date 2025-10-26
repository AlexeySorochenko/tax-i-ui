// src/components/api.js

/**
 * Общий заголовок авторизации.
 * ВАЖНО: не ставим Content-Type по умолчанию — иначе сломается FormData.
 */
export function authHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

/**
 * Утилита: аккуратно парсим JSON, если его нет — возвращаем {}
 * Если ответ не JSON (например, пустой body) — вернём { raw: "<text>" }.
 */
async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Утилита: собрать URL с query-параметрами.
 * withQuery("/path", { a:1, b:null }) -> "/path?a=1"
 */
export function withQuery(url, params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return url;
  const q = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `${url}${url.includes("?") ? "&" : "?"}${q.toString()}`;
}

/* ---------------------------
 * JSON helpers
 * --------------------------- */

export async function jget(url, token) {
  const r = await fetch(url, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonSafe(r);
}

export async function jpost(url, token, body = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonSafe(r);
}

export async function jput(url, token, body = {}) {
  const r = await fetch(url, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonSafe(r);
}

export async function jdel(url, token) {
  const r = await fetch(url, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonSafe(r);
}

/* ---------------------------
 * FORM helpers
 * --------------------------- */

export async function formPost(url, token, formData) {
  // НЕ ставим Content-Type вручную — браузер сам сформирует boundary
  const r = await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonSafe(r);
}

/* ---------------------------
 * Auth
 * --------------------------- */

export async function fetchMe(API, token) {
  const r = await fetch(`${API}/auth/me`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(await r.text());
  return parseJsonSafe(r); // { id, email, name, role }
}
