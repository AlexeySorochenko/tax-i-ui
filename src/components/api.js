// Универсальные вызовы API + хелперы, совместимые со старым DriverSelf.jsx и App.jsx

/* ========== базовые хелперы ========== */
export const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export const asJson = async (res) => {
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail);
      detail = j.detail || detail;
    } catch {}
    const err = new Error(detail || `${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : null;
  } catch {
    return txt;
  }
};

// Добавляет query-параметры к URL
export const withQuery = (base, params = {}) => {
  const url = new URL(
    base,
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  );
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  return url.toString();
};

// Простой GET с токеном
export async function jget(url, token) {
  const res = await fetch(url, { headers: { ...authHeaders(token) } });
  return asJson(res);
}

// POST/PUT c FormData (для загрузок и т.п.)
export async function formPost(url, token, formData, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { ...authHeaders(token) }, // без Content-Type — браузер сам поставит multipart boundary
    body: formData,
  });
  return asJson(res);
}

/* ========== аутентификация ========== */

export async function register(API, payload, inviteCode) {
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
  // FastAPI OAuth2 — form-urlencoded
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

// Совместимость со старым App.jsx
export async function fetchMe(API, token) {
  return me(API, token);
}

/* ========== фирмы (маркетплейс) ========== */

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

/* ========== период/флоу водителя ========== */

export async function periodStatus(API, token, driverUserId, year) {
  const res = await fetch(`${API}/api/v1/periods/status/${driverUserId}/${year}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}

/* ========== персональный профиль ========== */

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

/* ========== бизнес-профили и «умные» расходы ========== */

export async function getBusinessProfiles(API, token, userId) {
  const res = await fetch(`${API}/api/v1/business/profiles/${userId}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}

// business_code: "TAXI" | "TRUCK"
export async function createBusinessProfile(API, token, { name, business_code }) {
  const res = await fetch(`${API}/api/v1/business/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ name, business_code }),
  });
  return asJson(res);
}

// новый режим: ?mode=full возвращает схему+данные
export async function getBusinessExpenses(API, token, businessProfileId, year, { full = true } = {}) {
  const url = new URL(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`);
  if (full) url.searchParams.set("mode", "full");
  const res = await fetch(url, { headers: { ...authHeaders(token) } });
  return asJson(res);
}

export async function putBusinessExpenses(API, token, businessProfileId, year, expenses) {
  const res = await fetch(`${API}/api/v1/business/${businessProfileId}/expenses/${year}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ expenses }),
  });
  // 204 No Content → вернётся null, это ок
  return asJson(res);
}

export async function getBusinessSummary(API, token, businessProfileId, year) {
  const res = await fetch(`${API}/api/v1/business/${businessProfileId}/summary/${year}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}

/* ========== документы/загрузка (DriverSelf использует эти хелперы) ========== */

// Пример: presigned download url
export async function getDocumentDownloadUrl(API, token, documentId) {
  const res = await fetch(`${API}/api/v1/documents/download-url/${documentId}`, {
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}

/* ========== платёж-заглушка ========== */

export async function submitPaymentStub(API, token, year) {
  const res = await fetch(`${API}/api/v1/payment/submit-stub/${year}`, {
    method: "POST",
    headers: { ...authHeaders(token) },
  });
  return asJson(res);
}
