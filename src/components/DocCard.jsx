import React from "react";

/**
 * Карточка загруженного документа.
 * - Парсит fields_json.
 * - Если структура вида { formType, fields: [{boxNumber, boxDescription, value}, ...] }
 *   — показывает таблицу с боксами.
 * - Иначе — рендерит простые ключ-значение.
 */

function SmallKV({ k, v }) {
  return (
    <div className="kv">
      <div className="k">{k}</div>
      <div>{v ?? "—"}</div>
    </div>
  );
}

function BoxesTable({ formType, items }) {
  return (
    <div>
      {formType && <div className="note" style={{ marginBottom: 8 }}>{formType}</div>}
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Box</th>
              <th>Description</th>
              <th style={{ width: 220 }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td>{it.boxNumber ?? "—"}</td>
                <td>{it.boxDescription ?? "—"}</td>
                <td>{it.value ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DocCard({ d }) {
  // d: { id, filename, stored_filename, doc_type, fields_json, ... }
  let payload = null;
  try {
    payload = d.fields_json ? JSON.parse(d.fields_json) : null;
  } catch {
    payload = null;
  }

  const qualityIssues = payload?.quality_issues || [];
  const qualityText = qualityIssues.length ? qualityIssues.join(", ") : "No issues";

  // Унифицированное извлечение "полей"
  // 1) новый формат: payload.fields = { formType, fields: [...] }
  // 2) старый формат: payload.fields = { ssn: "...", wages: "...", ... }
  const fieldsBlock = payload?.fields || null;
  const isBoxes =
    fieldsBlock &&
    typeof fieldsBlock === "object" &&
    Array.isArray(fieldsBlock.fields);

  return (
    <div className="card" style={{ margin: "10px 0" }}>
      <div className="row spread">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <span className="badge">{d.doc_type || "UNKNOWN"}</span>
          <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {d.filename}
          </b>
        </div>
        {/* Кнопку скачивания пока не показываем (по твоей просьбе) */}
      </div>

      <div className="grid grid-cols-3" style={{ marginTop: 8 }}>
        <div>
          <h4 style={{ marginBottom: 6 }}>fields</h4>

          {/* Табличный вид с боксами */}
          {isBoxes ? (
            <BoxesTable formType={fieldsBlock.formType} items={fieldsBlock.fields} />
          ) : (
            // Простой key:value, если нет массива боксов
            <>
              {fieldsBlock && Object.keys(fieldsBlock).length ? (
                Object.entries(fieldsBlock).map(([k, v]) => (
                  <SmallKV key={k} k={k} v={String(v)} />
                ))
              ) : (
                <span className="note">—</span>
              )}
            </>
          )}
        </div>

        <div>
          <h4 style={{ marginBottom: 6 }}>Quality</h4>
          <div>{qualityText}</div>
        </div>

        {/* третья колонка свободна под будущие метаданные */}
        <div />
      </div>
    </div>
  );
}
