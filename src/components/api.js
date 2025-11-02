// --- Unified helpers ---
export function authHeaders(token, extra = {}) {
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

// Безопасно читаем JSON или текст/пустой ответ
async function safeJson(res) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// Превращаем fastapi/pydantic detail в строку
export function errorText(payload) {
  if (!payload) return "Request failed";
  if (typeof payload === "string") return payload;
  if (payload.detail) {
    const d = payload.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      // pydantic: [{loc:[..], msg:"...", type:"..."}]
      return d.map(x => x.msg || JSON.stringify(x)).join("; ");
    }
    return JSON.stringify(d);
  }
  return JSON.stringify(payload);
}

// JSON GET
export async function jget(url, token) {
  const r = await fetch(url, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

// JSON POST (возвращает JSON или null для 204)
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

// multipart/form-data POST
export async function formPost(url, token, formData) {
  const r = await fetch(url, { method: "POST", headers: authHeaders(token), body: formData });
  if (r.status === 204) return null;
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r);
}

// ---- Auth short-hands ----

export async function fetchMe(API, token) {
  const r = await fetch(`${API}/auth/me`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // { id, email, name, role }
}

// Бэкенд ждёт: { email, name, password, role? } — name обязателен!
export async function register(API, { email, name, password, role = "driver" }) {
  const r = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password, role }),
  });
  if (!r.ok) throw new Error(errorText(await safeJson(r)));
  return safeJson(r); // UserOut
}

// OAuth2PasswordRequestForm: username=email, password
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

// ---- Driver flow API used elsewhere (оставляю как было) ----
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
