"use client";

import { useEffect, useState } from "react";
import {
  api,
  type CertificateDefinition,
  type CertificateDefinitionInput,
  type CertificateSettings,
  type CertificateSettingsInput,
  type FinalTestAuthoring,
  type FinalTestQuestionInput,
  type IssuedCertificate,
  type IssuedCertificatePage,
  type TaxonomyApiNode,
} from "@/lib/api";

type Tab = "design" | "tests" | "credentials" | "issued";

const tabs: { id: Tab; label: string }[] = [
  { id: "design", label: "Design & Pricing" },
  { id: "tests", label: "Final Tests" },
  { id: "credentials", label: "Credentials" },
  { id: "issued", label: "Issued" },
];

const inputCls = "w-full px-3 py-2 text-xs font-mono rounded-sm border outline-none";

const fieldStyle: React.CSSProperties = {
  background: "var(--panel-2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

const focusProps = {
  onFocus: (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = "var(--accent)";
  },
  onBlur: (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = "var(--border)";
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function asError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-2)" }}>
        {label}
      </span>
      {children}
      {hint && (
        <span className="block font-mono mt-1" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={"rounded-sm border p-4" + (className ? ` ${className}` : "")}
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="font-mono text-xs tracking-widest mb-3" style={{ color: "var(--text-faint)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={inputCls}
        style={fieldStyle}
        {...focusProps}
      />
    </Field>
  );
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 shrink-0"
        style={{ accentColor: "var(--accent)" }}
      />
      <span className="font-mono text-xs" style={{ color: "var(--text-2)" }}>{label}</span>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={valid ? value : "#f59e0b"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 shrink-0 rounded-sm border cursor-pointer"
          style={{ background: "var(--panel-2)", borderColor: "var(--border)", padding: 0 }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          style={fieldStyle}
          {...focusProps}
        />
      </div>
    </Field>
  );
}

function CertificatePreview({ s }: { s: CertificateSettings }) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(s.certPrimaryColor) ? s.certPrimaryColor : "#1e3a8a";
  const accent = /^#[0-9a-fA-F]{6}$/.test(s.certAccentColor) ? s.certAccentColor : "#f59e0b";
  const fill = (text: string) => text.replace(/\{passPercent\}/g, String(s.defaultPassPercent));
  const date = formatDate(new Date().toISOString());
  const facts = [
    { label: s.certCourseLabel, value: "Advanced Data Analysis" },
    { label: s.certScoreLabel, value: "92%" },
    { label: s.certDateLabel, value: date },
    { label: s.certCodeLabel, value: "CERT-7K2M-41QX" },
  ];

  return (
    <div className="shrink-0" style={{ overflowX: "auto" }}>
      <div
        style={{
          width: 792,
          height: 612,
          boxSizing: "border-box",
          position: "relative",
          background: "#ffffff",
          color: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          padding: 26,
        }}
      >
        <div style={{ position: "absolute", top: 12, right: 12, bottom: 12, left: 12, border: `2px solid ${primary}` }} />
        <div style={{ position: "absolute", top: 20, right: 20, bottom: 20, left: 20, border: `1px solid ${accent}` }} />
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "14px 44px 6px",
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 10,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#6b7280",
            }}
          >
            {s.certOrgName}
          </div>
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 32,
              fontWeight: 700,
              color: primary,
              marginTop: 8,
            }}
          >
            {fill(s.certHeading)}
          </div>
          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 12, fontStyle: "italic" }}>
            {fill(s.certIntro)}
          </div>
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 30,
              marginTop: 6,
              color: "#111827",
              borderBottom: `1px solid ${accent}`,
              paddingBottom: 4,
            }}
          >
            Amara Okonkwo
          </div>
          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 12 }}>{fill(s.certAchieved)}</div>
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 19,
              color: primary,
              marginTop: 4,
            }}
          >
            Advanced Data Analysis
          </div>
          <div style={{ display: "flex", gap: 36, marginTop: 18 }}>
            {facts.map((f, i) => (
              <div key={i} style={{ minWidth: 88 }}>
                <div
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                  }}
                >
                  {f.label}
                </div>
                <div style={{ fontSize: 13, marginTop: 3, color: "#111827" }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "auto",
              width: "100%",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ width: 210, borderTop: "1px solid #9ca3af", marginBottom: 5 }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.certSignatureName}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{s.certSignatureTitle}</div>
            </div>
            {s.certShowQr && (
              <div
                style={{
                  width: 62,
                  height: 62,
                  border: "1px solid #d1d5db",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 9,
                  color: "#9ca3af",
                }}
              >
                QR CODE
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: 11, color: "#6b7280", maxWidth: 240 }}>
              {s.certFooter}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignTab() {
  const [form, setForm] = useState<CertificateSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.certificates
      .getSettings()
      .then((s) => {
        if (!cancelled) setForm(s);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(asError(err, "Failed to load certificate settings"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof CertificateSettings>(key: K, value: CertificateSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  const handleSave = async () => {
    if (!form || saving) return;
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const payload = { ...form } as CertificateSettingsInput & { updatedAt?: string };
      delete payload.updatedAt;
      const next = await api.certificates.updateSettings(payload);
      setForm(next);
      setSaved(true);
    } catch (err) {
      setSaveError(asError(err, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-xs" style={{ color: "var(--danger)" }}>
        {loadError}
      </div>
    );
  }

  if (!form) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-xs" style={{ color: "var(--text-faint)" }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div className="h-full scrollable p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest" style={{ color: "var(--text-faint)" }}>
            CERTIFICATE SETTINGS
          </span>
          {saved && (
            <span className="font-mono text-xs" style={{ color: "var(--ok)" }}>Saved</span>
          )}
          {saveError && (
            <span className="font-mono text-xs" style={{ color: "var(--danger)" }}>{saveError}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto px-4 py-1.5 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="PRICING">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="TEST PRICE (USD CENTS)" value={form.testPriceCents} min={0} onChange={(v) => setField("testPriceCents", v)} />
              <NumberField label="TEST PRICE (UGX)" value={form.testPriceUgx} min={0} onChange={(v) => setField("testPriceUgx", v)} />
              <NumberField label="FREE ATTEMPT AT (%) PROGRESS" value={form.freeAttemptProgressPercent} min={0} max={100} onChange={(v) => setField("freeAttemptProgressPercent", v)} />
              <NumberField label="DEFAULT PASS (%)" value={form.defaultPassPercent} min={1} max={100} onChange={(v) => setField("defaultPassPercent", v)} />
            </div>
          </Panel>

          <Panel title="LOOK">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <ColorField label="PRIMARY COLOR" value={form.certPrimaryColor} onChange={(v) => setField("certPrimaryColor", v)} />
              <ColorField label="ACCENT COLOR" value={form.certAccentColor} onChange={(v) => setField("certAccentColor", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <Field label="PAPER SIZE">
                <select
                  value={form.certPaperSize}
                  onChange={(e) => setField("certPaperSize", e.target.value === "portrait" ? "portrait" : "landscape")}
                  className={inputCls}
                  style={fieldStyle}
                  {...focusProps}
                >
                  <option value="landscape">landscape</option>
                  <option value="portrait">portrait</option>
                </select>
              </Field>
              <div className="space-y-2 pb-1">
                <Check checked={form.certShowQr} onChange={(v) => setField("certShowQr", v)} label="Show QR code" />
                <Check checked={form.certEnabled} onChange={(v) => setField("certEnabled", v)} label="Certificates enabled" />
              </div>
            </div>
          </Panel>

          <Panel title="TEST WORDING">
            <div className="space-y-3">
              <Field label="TEST TITLE">
                <input
                  type="text"
                  value={form.testTitle}
                  onChange={(e) => setField("testTitle", e.target.value)}
                  className={inputCls}
                  style={fieldStyle}
                  {...focusProps}
                />
              </Field>
              <Field
                label="TEST INSTRUCTIONS"
                hint="Supports the {passPercent} placeholder — it is replaced with the pass percent at runtime."
              >
                <textarea
                  value={form.testInstructions}
                  onChange={(e) => setField("testInstructions", e.target.value)}
                  rows={4}
                  className={inputCls + " resize-y"}
                  style={fieldStyle}
                  {...focusProps}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="CERTIFICATE WORDING">
            <div className="grid grid-cols-2 gap-3">
              <Field label="HEADING">
                <input type="text" value={form.certHeading} onChange={(e) => setField("certHeading", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="INTRO">
                <input type="text" value={form.certIntro} onChange={(e) => setField("certIntro", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="ACHIEVED LINE">
                <input type="text" value={form.certAchieved} onChange={(e) => setField("certAchieved", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="ORG NAME">
                <input type="text" value={form.certOrgName} onChange={(e) => setField("certOrgName", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="COURSE LABEL">
                <input type="text" value={form.certCourseLabel} onChange={(e) => setField("certCourseLabel", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="SCORE LABEL">
                <input type="text" value={form.certScoreLabel} onChange={(e) => setField("certScoreLabel", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="DATE LABEL">
                <input type="text" value={form.certDateLabel} onChange={(e) => setField("certDateLabel", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="CODE LABEL">
                <input type="text" value={form.certCodeLabel} onChange={(e) => setField("certCodeLabel", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="SIGNATURE NAME">
                <input type="text" value={form.certSignatureName} onChange={(e) => setField("certSignatureName", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="SIGNATURE TITLE">
                <input type="text" value={form.certSignatureTitle} onChange={(e) => setField("certSignatureTitle", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="FOOTER">
                <input type="text" value={form.certFooter} onChange={(e) => setField("certFooter", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="rounded-sm border p-4" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
          <div className="font-mono text-xs tracking-widest mb-3" style={{ color: "var(--text-faint)" }}>
            LIVE PREVIEW — {form.certPaperSize.toUpperCase()}
          </div>
          <CertificatePreview s={form} />
        </div>
      </div>
    </div>
  );
}

interface TestState {
  courseId: string;
  data: FinalTestAuthoring | null;
  error: string | null;
}

function FinalTestsTab({ courses, coursesError }: { courses: TaxonomyApiNode[]; coursesError: string }) {
  const [courseId, setCourseId] = useState("");
  const [state, setState] = useState<TestState | null>(null);
  const [questions, setQuestions] = useState<FinalTestQuestionInput[]>([]);
  const [passPercent, setPassPercent] = useState(70);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    api.certificates
      .getFinalTest(courseId)
      .then((data) => {
        if (!cancelled) {
          setState({ courseId, data, error: null });
          setQuestions(data.questions ?? []);
          setPassPercent(data.passPercent ?? 70);
          setSaveError("");
          setSaved(false);
        }
      })
      .catch((err) => {
        if (!cancelled) setState({ courseId, data: null, error: asError(err, "Failed to load final test") });
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const active = state && state.courseId === courseId ? state : null;
  const loading = Boolean(courseId) && !active;
  const loadError = active?.error ?? null;

  const updateQuestion = (index: number, patch: Partial<FinalTestQuestionInput>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    setSaved(false);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, oi) => (oi === oIndex ? value : o)) } : q))
    );
    setSaved(false);
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ""] } : q)));
    setSaved(false);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex || q.options.length <= 2) return q;
        const options = q.options.filter((_, oi) => oi !== oIndex);
        const answerIndex = q.answerIndex >= options.length ? 0 : q.answerIndex === oIndex ? 0 : q.answerIndex > oIndex ? q.answerIndex - 1 : q.answerIndex;
        return { ...q, options, answerIndex };
      })
    );
    setSaved(false);
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { question: "", options: ["", ""], answerIndex: 0 }]);
    setSaved(false);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!courseId || saving) return;
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const payload = questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        answerIndex: q.answerIndex,
      }));
      const data = await api.certificates.saveFinalTest(courseId, { questions: payload, passPercent });
      setState({ courseId, data, error: null });
      setQuestions(data.questions ?? []);
      setPassPercent(data.passPercent ?? passPercent);
      setSaved(true);
    } catch (err) {
      setSaveError(asError(err, "Failed to save final test"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>COURSE</span>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono rounded-sm border outline-none min-w-[240px]"
          style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          <option value="">Select a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {coursesError && (
          <span className="font-mono text-xs" style={{ color: "var(--danger)" }}>{coursesError}</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {saved && !saveError && <span className="font-mono text-xs" style={{ color: "var(--ok)" }}>Saved</span>}
          {saveError && <span className="font-mono text-xs" style={{ color: "var(--danger)" }}>{saveError}</span>}
          {courseId && !loadError && !loading && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {saving ? "Saving..." : "Save test"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 scrollable p-5">
        {!courseId ? (
          <div className="text-center py-12">
            <div className="font-mono text-sm" style={{ color: "var(--text-faint)" }}>No course selected</div>
            <div className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
              Pick a course above to author its final test
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--text-faint)" }}>
            Loading final test...
          </div>
        ) : loadError ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--danger)" }}>{loadError}</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="rounded-sm border p-4 flex items-end gap-4" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
              <div className="w-40">
                <NumberField label="PASS PERCENT" value={passPercent} min={1} max={100} onChange={(v) => { setPassPercent(v); setSaved(false); }} />
              </div>
              <div className="flex-1 pb-1">
                <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                  The answer key stays admin-only — learners never receive it.
                </span>
              </div>
            </div>

            {questions.length === 0 && (
              <div className="rounded-sm border p-8 text-center" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                <div className="font-mono text-sm" style={{ color: "var(--text-faint)" }}>No questions yet</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                  {active?.data ? "This course has no final test questions" : "Add the first question below"}
                </div>
              </div>
            )}

            {questions.map((q, qi) => (
              <div key={qi} className="rounded-sm border p-4 space-y-3" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
                    Q{qi + 1}
                  </span>
                  <div className="ml-auto">
                    <button
                      onClick={() => removeQuestion(qi)}
                      className="px-2.5 py-1 text-xs font-mono rounded-sm"
                      style={{ color: "var(--danger)", border: "1px solid var(--border)" }}
                    >
                      Delete question
                    </button>
                  </div>
                </div>

                <textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                  rows={2}
                  placeholder="Question text"
                  className={inputCls + " resize-y"}
                  style={fieldStyle}
                  {...focusProps}
                />

                <div className="space-y-2">
                  <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-2)" }}>
                    OPTIONS — mark the correct answer
                  </div>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.answerIndex === oi}
                        onChange={() => updateQuestion(qi, { answerIndex: oi })}
                        aria-label={`Mark option ${oi + 1} correct`}
                        className="shrink-0 w-3.5 h-3.5"
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className={inputCls}
                        style={fieldStyle}
                        {...focusProps}
                      />
                      <button
                        onClick={() => removeOption(qi, oi)}
                        disabled={q.options.length <= 2}
                        aria-label={`Remove option ${oi + 1}`}
                        className="px-2 py-1.5 text-xs font-mono rounded-sm disabled:opacity-30 shrink-0"
                        style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addOption(qi)}
                    className="px-2.5 py-1 text-xs font-mono rounded-sm"
                    style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                  >
                    + Add option
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="w-full py-2.5 text-xs font-mono rounded-sm transition-colors"
              style={{ color: "var(--text-2)", border: "1px dashed var(--border)", background: "var(--panel)" }}
            >
              + Add question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface DefForm {
  name: string;
  slug: string;
  shortName: string;
  description: string;
  badgeColor: string;
  courseNodeId: string;
  requireFinalTest: boolean;
  requireCourseComplete: boolean;
  passPercent: number;
  minProgressPercent: number;
  autoIssue: boolean;
  certHeadingOverride: string;
  certIntroOverride: string;
  certAchievedOverride: string;
  accentColorOverride: string;
  isEnabled: boolean;
  sortOrder: number;
}

const emptyDefForm: DefForm = {
  name: "",
  slug: "",
  shortName: "",
  description: "",
  badgeColor: "",
  courseNodeId: "",
  requireFinalTest: false,
  requireCourseComplete: true,
  passPercent: 80,
  minProgressPercent: 100,
  autoIssue: true,
  certHeadingOverride: "",
  certIntroOverride: "",
  certAchievedOverride: "",
  accentColorOverride: "",
  isEnabled: true,
  sortOrder: 0,
};

function toDefForm(def: CertificateDefinition): DefForm {
  return {
    name: def.name,
    slug: def.slug,
    shortName: def.shortName ?? "",
    description: def.description ?? "",
    badgeColor: def.badgeColor ?? "",
    courseNodeId: def.courseId ?? "",
    requireFinalTest: def.requireFinalTest,
    requireCourseComplete: def.requireCourseComplete,
    passPercent: def.passPercent,
    minProgressPercent: def.minProgressPercent,
    autoIssue: def.autoIssue,
    certHeadingOverride: def.certHeadingOverride ?? "",
    certIntroOverride: def.certIntroOverride ?? "",
    certAchievedOverride: def.certAchievedOverride ?? "",
    accentColorOverride: def.accentColorOverride ?? "",
    isEnabled: def.isEnabled,
    sortOrder: def.sortOrder,
  };
}

function toDefInput(form: DefForm): CertificateDefinitionInput {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    shortName: form.shortName.trim() || undefined,
    description: form.description.trim() || undefined,
    badgeColor: form.badgeColor.trim() || undefined,
    courseNodeId: form.courseNodeId,
    requireFinalTest: form.requireFinalTest,
    requireCourseComplete: form.requireCourseComplete,
    passPercent: form.passPercent,
    minProgressPercent: form.minProgressPercent,
    autoIssue: form.autoIssue,
    certHeadingOverride: form.certHeadingOverride.trim(),
    certIntroOverride: form.certIntroOverride.trim(),
    certAchievedOverride: form.certAchievedOverride.trim(),
    accentColorOverride: form.accentColorOverride.trim(),
    isEnabled: form.isEnabled,
    sortOrder: form.sortOrder,
  };
}

function CriteriaBadge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "accent" | "ok" }) {
  const colors =
    tone === "accent"
      ? { background: "var(--badge-warning-bg)", color: "var(--badge-warning-text)" }
      : tone === "ok"
        ? { background: "var(--badge-success-bg)", color: "var(--badge-success-text)" }
        : { background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)" };
  return (
    <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{ ...colors, fontSize: "10px", border: "1px solid var(--border)" }}>
      {text}
    </span>
  );
}

function CredentialsTab({ courses, coursesError }: { courses: TaxonomyApiNode[]; coursesError: string }) {
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; defs: CertificateDefinition[] | null; error: string | null } | null>(null);
  const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; def: CertificateDefinition } | null>(null);
  const [form, setForm] = useState<DefForm>(emptyDefForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [awardId, setAwardId] = useState<string | null>(null);
  const [awardEmail, setAwardEmail] = useState("");
  const [awardName, setAwardName] = useState("");
  const [awardBusy, setAwardBusy] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [awardNotice, setAwardNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const key = String(reload);

  useEffect(() => {
    let cancelled = false;
    api.certificates
      .listDefinitions()
      .then((defs) => {
        if (!cancelled) setResult({ key, defs, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, defs: null, error: asError(err, "Failed to load credentials") });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = result && result.key === key ? result : null;
  const loading = !current;
  const defs = current?.defs ?? [];
  const loadError = current?.error ?? null;
  const refetch = () => setReload((r) => r + 1);

  const openCreate = () => {
    setForm({ ...emptyDefForm });
    setEditing({ mode: "create" });
    setFormError("");
  };

  const openEdit = (def: CertificateDefinition) => {
    setForm(toDefForm(def));
    setEditing({ mode: "edit", def });
    setFormError("");
  };

  const closeEditor = () => setEditing(null);

  const handleSave = async () => {
    if (!editing || saving) return;
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const input = toDefInput(form);
      if (editing.mode === "create") {
        await api.certificates.createDefinition(input);
      } else {
        await api.certificates.updateDefinition(editing.def.id, input);
      }
      setEditing(null);
      refetch();
    } catch (err) {
      setFormError(asError(err, "Failed to save credential"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (def: CertificateDefinition) => {
    if (!confirm(`Delete credential "${def.name}"? This cannot be undone.`)) return;
    setBusyId(def.id);
    try {
      await api.certificates.deleteDefinition(def.id);
      refetch();
    } catch (err) {
      alert(asError(err, "Failed to delete credential"));
    } finally {
      setBusyId(null);
    }
  };

  const toggleEnabled = async (def: CertificateDefinition) => {
    setBusyId(def.id);
    try {
      await api.certificates.updateDefinition(def.id, { name: def.name, isEnabled: !def.isEnabled });
      refetch();
    } catch (err) {
      alert(asError(err, "Failed to update credential"));
    } finally {
      setBusyId(null);
    }
  };

  const openAward = (def: CertificateDefinition) => {
    setAwardId(def.id);
    setAwardEmail("");
    setAwardName("");
    setAwardError("");
    setAwardNotice("");
  };

  const handleAward = async (def: CertificateDefinition) => {
    if (!awardEmail.trim() || awardBusy) return;
    setAwardBusy(true);
    setAwardError("");
    setAwardNotice("");
    try {
      await api.certificates.issue(def.id, {
        userEmail: awardEmail.trim(),
        recipientName: awardName.trim() || undefined,
      });
      setAwardNotice(`Credential awarded to ${awardEmail.trim()}`);
      setAwardEmail("");
      setAwardName("");
      refetch();
    } catch (err) {
      setAwardError(asError(err, "Failed to award credential"));
    } finally {
      setAwardBusy(false);
    }
  };

  const setField = <K extends keyof DefForm>(key: K, value: DefForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full scrollable p-5">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest" style={{ color: "var(--text-faint)" }}>
            CREDENTIAL DEFINITIONS
          </span>
          <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
            {loading ? "Loading..." : `${defs.length} total`}
          </span>
          <button
            onClick={openCreate}
            className="ml-auto px-3 py-1.5 text-xs font-mono rounded-sm transition-colors"
            style={{ background: "#f59e0b", color: "#000" }}
          >
            + New credential
          </button>
        </div>

        {editing && (
          <div className="rounded-sm border p-4 space-y-4" style={{ background: "var(--panel)", borderColor: "var(--accent)" }}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tracking-widest" style={{ color: "var(--accent)" }}>
                {editing.mode === "create" ? "NEW CREDENTIAL" : `EDIT — ${editing.def.name}`}
              </span>
              <div className="ml-auto flex items-center gap-3">
                {formError && <span className="font-mono text-xs" style={{ color: "var(--danger)" }}>{formError}</span>}
                <button
                  onClick={closeEditor}
                  className="px-3 py-1.5 text-xs font-mono rounded-sm"
                  style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="px-4 py-1.5 text-xs font-mono rounded-sm disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {saving ? "Saving..." : "Save credential"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="NAME *">
                <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="SLUG" hint="Blank keeps the generated slug">
                <input type="text" value={form.slug} onChange={(e) => setField("slug", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="SHORT NAME">
                <input type="text" value={form.shortName} onChange={(e) => setField("shortName", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="COURSE" hint={coursesError || "Blank = any course"}>
                <select
                  value={form.courseNodeId}
                  onChange={(e) => setField("courseNodeId", e.target.value)}
                  className={inputCls}
                  style={fieldStyle}
                  {...focusProps}
                >
                  <option value="">Any course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <ColorField label="BADGE COLOR" value={form.badgeColor} onChange={(v) => setField("badgeColor", v)} />
              <ColorField label="ACCENT OVERRIDE" value={form.accentColorOverride} onChange={(v) => setField("accentColorOverride", v)} />
              <NumberField label="PASS PERCENT" value={form.passPercent} min={1} max={100} onChange={(v) => setField("passPercent", v)} />
              <NumberField label="MIN PROGRESS PERCENT" value={form.minProgressPercent} min={0} max={100} onChange={(v) => setField("minProgressPercent", v)} />
              <NumberField label="SORT ORDER" value={form.sortOrder} onChange={(v) => setField("sortOrder", v)} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Check checked={form.requireFinalTest} onChange={(v) => setField("requireFinalTest", v)} label="Requires final test" />
              <Check checked={form.requireCourseComplete} onChange={(v) => setField("requireCourseComplete", v)} label="Requires completion" />
              <Check checked={form.autoIssue} onChange={(v) => setField("autoIssue", v)} label="Auto-issue" />
              <Check checked={form.isEnabled} onChange={(v) => setField("isEnabled", v)} label="Enabled" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Field label="HEADING OVERRIDE">
                <input type="text" value={form.certHeadingOverride} onChange={(e) => setField("certHeadingOverride", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="INTRO OVERRIDE">
                <input type="text" value={form.certIntroOverride} onChange={(e) => setField("certIntroOverride", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
              <Field label="ACHIEVED OVERRIDE">
                <input type="text" value={form.certAchievedOverride} onChange={(e) => setField("certAchievedOverride", e.target.value)} className={inputCls} style={fieldStyle} {...focusProps} />
              </Field>
            </div>

            <Field label="DESCRIPTION">
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={2}
                className={inputCls + " resize-y"}
                style={fieldStyle}
                {...focusProps}
              />
            </Field>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--text-faint)" }}>
            Loading credentials...
          </div>
        ) : loadError ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--danger)" }}>{loadError}</div>
        ) : defs.length === 0 ? (
          <div className="text-center py-12">
            <div className="font-mono text-sm" style={{ color: "var(--text-faint)" }}>No credentials yet</div>
            <div className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
              Create a credential definition to start awarding certificates
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {defs.map((def) => (
              <div key={def.id} className="rounded-sm border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
                <div className="flex items-start gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: def.badgeColor || "var(--accent)" }}
                      />
                      <span className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>{def.name}</span>
                      {def.shortName && (
                        <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>{def.shortName}</span>
                      )}
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{ fontSize: "10px", ...(def.isEnabled ? { background: "var(--badge-success-bg)", color: "var(--badge-success-text)" } : { background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)" }) }}>
                        {def.isEnabled ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>
                    <div className="font-mono text-xs mt-1" style={{ color: "var(--text-3)" }}>
                      {def.courseName ? `Course: ${def.courseName}` : "Course: any"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {def.requireFinalTest && <CriteriaBadge text="Final test" tone="accent" />}
                      {def.requireCourseComplete && <CriteriaBadge text="Course complete" tone="accent" />}
                      <CriteriaBadge text={`Pass ${def.passPercent}%`} />
                      <CriteriaBadge text={`Min progress ${def.minProgressPercent}%`} />
                      {def.autoIssue && <CriteriaBadge text="Auto-issue" tone="ok" />}
                      <CriteriaBadge text={`${def.issuedCount} issued`} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => (awardId === def.id ? setAwardId(null) : openAward(def))}
                      className="px-2.5 py-1.5 text-xs font-mono rounded-sm"
                      style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                    >
                      Manually award
                    </button>
                    <button
                      onClick={() => toggleEnabled(def)}
                      disabled={busyId === def.id}
                      className="px-2.5 py-1.5 text-xs font-mono rounded-sm disabled:opacity-40"
                      style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                    >
                      {def.isEnabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => openEdit(def)}
                      className="px-2.5 py-1.5 text-xs font-mono rounded-sm"
                      style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(def)}
                      disabled={busyId === def.id}
                      aria-label={`Delete ${def.name}`}
                      className="w-7 h-7 flex items-center justify-center rounded-sm disabled:opacity-40"
                      style={{ color: "var(--text-faint)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--danger)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-faint)";
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {awardId === def.id && (
                  <div className="px-4 py-3 border-t flex items-end gap-3 flex-wrap" style={{ borderColor: "var(--border)", background: "var(--panel-3)" }}>
                    <div className="w-64">
                      <Field label="RECIPIENT EMAIL *">
                        <input
                          type="email"
                          value={awardEmail}
                          onChange={(e) => setAwardEmail(e.target.value)}
                          placeholder="learner@example.com"
                          className={inputCls}
                          style={fieldStyle}
                          {...focusProps}
                        />
                      </Field>
                    </div>
                    <div className="w-56">
                      <Field label="PRINTED NAME (OPTIONAL)">
                        <input
                          type="text"
                          value={awardName}
                          onChange={(e) => setAwardName(e.target.value)}
                          placeholder="Name on the certificate"
                          className={inputCls}
                          style={fieldStyle}
                          {...focusProps}
                        />
                      </Field>
                    </div>
                    <button
                      onClick={() => handleAward(def)}
                      disabled={awardBusy || !awardEmail.trim()}
                      className="px-4 py-2 text-xs font-mono rounded-sm disabled:opacity-40"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      {awardBusy ? "Awarding..." : "Award"}
                    </button>
                    <button
                      onClick={() => setAwardId(null)}
                      className="px-3 py-2 text-xs font-mono rounded-sm"
                      style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
                    >
                      Close
                    </button>
                    {awardError && (
                      <span className="font-mono text-xs" style={{ color: "var(--danger)" }}>{awardError}</span>
                    )}
                    {awardNotice && !awardError && (
                      <span className="font-mono text-xs" style={{ color: "var(--ok)" }}>{awardNotice}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IssuedTab() {
  const [status, setStatus] = useState<"active" | "all">("active");
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data: IssuedCertificatePage | null; error: string | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const key = `${status}:${page}:${reload}`;

  useEffect(() => {
    let cancelled = false;
    api.certificates
      .listIssued({ status, page, size: 25 })
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, data: null, error: asError(err, "Failed to load issued credentials") });
      });
    return () => {
      cancelled = true;
    };
  }, [key, status, page]);

  const current = result && result.key === key ? result : null;
  const loading = !current;
  const loadError = current?.error ?? null;
  const data = current?.data ?? null;
  const rows = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const changeStatus = (next: "active" | "all") => {
    setStatus(next);
    setPage(0);
  };

  const handleRevoke = async (cert: IssuedCertificate) => {
    if (!confirm(`Revoke credential ${cert.code} for ${cert.recipientName}?`)) return;
    setBusyId(cert.id);
    try {
      await api.certificates.revoke(cert.id);
      setReload((r) => r + 1);
    } catch (err) {
      alert(asError(err, "Failed to revoke credential"));
    } finally {
      setBusyId(null);
    }
  };

  const handleReinstate = async (cert: IssuedCertificate) => {
    if (!confirm(`Reinstate credential ${cert.code} for ${cert.recipientName}?`)) return;
    setBusyId(cert.id);
    try {
      await api.certificates.reinstate(cert.id);
      setReload((r) => r + 1);
    } catch (err) {
      alert(asError(err, "Failed to reinstate credential"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-1">
          {(["active", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => changeStatus(f)}
              className="font-mono text-xs px-2.5 py-1.5 transition-colors"
              style={{
                background: status === f ? "var(--accent)" : "transparent",
                color: status === f ? "#000" : "var(--text-3)",
                border: "1px solid " + (status === f ? "var(--accent)" : "var(--border)"),
                borderRadius: "3px",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-xs" style={{ color: "var(--text-faint)" }}>
          {loading ? "Loading..." : `${data?.totalElements ?? rows.length} credentials`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--text-faint)" }}>
            Loading issued credentials...
          </div>
        ) : loadError ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--danger)" }}>{loadError}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="font-mono text-sm" style={{ color: "var(--text-faint)" }}>No credentials found</div>
          </div>
        ) : (
          <div className="rounded-sm border overflow-x-auto" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["Recipient", "Email", "Course", "Credential", "Score", "Issued", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left font-mono text-xs px-3 py-2.5 tracking-wider whitespace-nowrap"
                      style={{ color: "var(--text-faint)", background: "var(--panel-3)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((cert) => (
                  <tr key={cert.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border-faint)" }}>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--text)" }}>
                      {cert.recipientName}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span style={{ color: "var(--text-3)" }}>{cert.userEmail ?? "—"}</span>
                        {cert.emailError && (
                          <span
                            title={cert.emailError}
                            className="font-mono px-1 py-0.5 rounded-sm cursor-help"
                            style={{ fontSize: "9px", background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)" }}
                          >
                            MAIL ERR
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                      {cert.courseName}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      <div style={{ color: "var(--text-2)" }}>{cert.definitionName}</div>
                      <div className="font-mono" style={{ color: "var(--text-faint)", fontSize: "10px" }}>{cert.code}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                      {cert.score != null && cert.total != null ? `${cert.score}/${cert.total}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                      {formatDate(cert.issuedAt)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className="font-mono text-xs px-1.5 py-0.5 rounded-sm uppercase"
                        style={{
                          fontSize: "10px",
                          ...(cert.revoked
                            ? { background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)" }
                            : { background: "var(--badge-success-bg)", color: "var(--badge-success-text)" }),
                        }}
                      >
                        {cert.revoked ? "revoked" : "active"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {cert.verifyUrl && (
                          <a
                            href={cert.verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-mono"
                            style={{ color: "var(--accent)", fontSize: "10px" }}
                          >
                            Verify
                          </a>
                        )}
                        {cert.revoked ? (
                          <button
                            onClick={() => handleReinstate(cert)}
                            disabled={busyId === cert.id}
                            className="px-2 py-1 text-xs font-mono rounded-sm disabled:opacity-40"
                            style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                          >
                            Reinstate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevoke(cert)}
                            disabled={busyId === cert.id}
                            className="px-2 py-1 text-xs font-mono rounded-sm disabled:opacity-40"
                            style={{ color: "var(--danger)", border: "1px solid var(--border)" }}
                          >
                            Revoke
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t flex items-center justify-center gap-2" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0}
            className="font-mono text-xs px-2 py-1 disabled:opacity-30"
            style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-3)" }}
          >
            ←
          </button>
          <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="font-mono text-xs px-2 py-1 disabled:opacity-30"
            style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-3)" }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

export default function CertificateStudio() {
  const [tab, setTab] = useState<Tab>("design");
  const [courses, setCourses] = useState<TaxonomyApiNode[]>([]);
  const [coursesError, setCoursesError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.taxonomy
      .list()
      .then((tree) => {
        if (cancelled) return;
        const flat: TaxonomyApiNode[] = [];
        const walk = (nodes: TaxonomyApiNode[]) => {
          for (const n of nodes) {
            if (n.nodeType === "course") flat.push(n);
            if (n.children) walk(n.children);
          }
        };
        walk(tree);
        setCourses(flat);
      })
      .catch((err) => {
        if (!cancelled) setCoursesError(asError(err, "Failed to load courses"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="shrink-0 px-5 py-2 flex items-center gap-1 border-b" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="font-mono text-xs px-3 py-1.5 transition-colors"
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent-soft-text)" : "var(--text-3)",
                border: "1px solid " + (active ? "var(--accent-soft-border)" : "transparent"),
                borderRadius: "3px",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        {tab === "design" && <DesignTab />}
        {tab === "tests" && <FinalTestsTab courses={courses} coursesError={coursesError} />}
        {tab === "credentials" && <CredentialsTab courses={courses} coursesError={coursesError} />}
        {tab === "issued" && <IssuedTab />}
      </div>
    </div>
  );
}
