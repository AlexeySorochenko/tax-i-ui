// Универсальные вызовы API, совместимые с новой "умной" схемой расходов.

const asJson = async (res) => {
  if (!res.ok) {
    let detail = await res.text();
    try { const j = JSON.parse(detail); detail = j.detail || detail; } catch {}
    const err = new Error(detail || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : null; } catch { return txt; }
};

const authHeaders = (token) => token ? { "Authorization": `Bearer ${token}` } : {};

export async function register(API, payload, inviteCode) {
  // POST /auth/register (driver) — JSON
  const url = new URL(`${API}/auth/register`);
  if (inviteCode) url.searchParams.set("invite_code", inviteCode);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return asJson(res);
}

export async function login(API, { email, password }) {
  // POST /auth/token — x-www-form-urlencoded (username/password)
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  const res = await fetch(`${API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return asJson(res);
}

export async function me(API, token) {
  const res = await fetch(`${API}/auth/me`, { headers: { ...authHeaders(token) } });
  return asJson(res);
}

/* ===== Маркетплейс фирм ===== */
export async function listFirms(API, token) {
  const res = await fetch(`${API}/api/v1/firms`, { headers: { ...authHeaders(token) } });
  return asJson(res);
}
export async function selectFirm(API, token, firmId) {
  const res = await fetch(`${API}/api/v1/firms/select/${firmId}`, {
    method: "POST",
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}

/* ===== Период/флоу водителя ===== */
export async function periodStatus(API, token, driverUserId, year) {
  const res = await fetch(`${API}/api/v1/periods/status/${driverUserId}/${year}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}

/* ===== Персональный профиль ===== */
export async function getPersonal(API, token, userId) {
  const res = await fetch(`${API}/api/v1/profiles/personal/${userId}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}
export async function putPersonal(API, token, userId, payload) {
  const res = await fetch(`${API}/api/v1/profiles/personal/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return asJson(res);
}

/* ===== Бизнес-профили и расходы ===== */
export async function getBusinessProfiles(API, token, userId) {
  const res = await fetch(`${API}/api/v1/business/profiles/${userId}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}

export async function createBusinessProfile(API, token, { name, business_code }) {
  // business_code: "TAXI" | "TRUCK"
  const res = await fetch(`${API}/api/v1/business/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ name, business_code }),
  });
  return asJson(res);
}

export async function getBusinessExpenses(API, token, businessProfileId, year, { full = true } = {}) {
  const url = new URL(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`);
  if (full) url.searchParams.set("mode", "full");
  const res = await fetch(url, { headers: { ...authHeaders(token) } });
  return asJson(res); // ожидаем массив [{code,label,amount,hint,order,is_custom,ui_rules:{...}}]
}

export async function putBusinessExpenses(API, token, businessProfileId, year, expenses) {
  const res = await fetch(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ expenses }),
  });
  // 204 No Content — вернёт null → ок
  return asJson(res);
}

export async function getBusinessSummary(API, token, businessProfileId, year) {
  const res = await fetch(`${API}/api/v1/business/${businessProfileId}/summary/${year}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res); // { total, categories:[{code,label,amount}], filled, missing, ... }
}

/* ===== Платёж-заглушка (submit) ===== */
export async function submitPaymentStub(API, token, year) {
  const res = await fetch(`${API}/api/v1/payment/submit-stub/${year}`, {
    method: "POST",
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}
