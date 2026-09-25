"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type AiProviderApi, type AiProviderKeyApi, type AiSettingsApi } from "@/lib/api";

const PROVIDER_PRESETS: Record<string, { baseUrl: string; model: string; label: string }> = {
  OPENAI: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", label: "OpenAI" },
  ANTHROPIC: { baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-20250514", label: "Anthropic (Claude)" },
  GEMINI: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash", label: "Google Gemini" },
  DEEPSEEK: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", label: "DeepSeek" },
  OPENROUTER: { baseUrl: "https://openrouter.ai/api/v1", model: "openrouter/auto", label: "OpenRouter (auto)" },
  CUSTOM: { baseUrl: "", model: "", label: "Custom (OpenAI-compatible)" },
};

export default function AiSettingsPanel() {
  const [providers, setProviders] = useState<AiProviderApi[]>([]);
  const [settings, setSettings] = useState<AiSettingsApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const [keys, setKeys] = useState<AiProviderKeyApi[]>([]);
  const [keyForm, setKeyForm] = useState({ apiKey: "", label: "" });
  const [savingKey, setSavingKey] = useState(false);

  const [form, setForm] = useState({
    name: "",
    providerType: "OPENAI",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.aiProviders.list(), api.aiProviders.getSettings()]);
      setProviders(p);
      setSettings(s);
    } catch (err) {
      console.error("Failed to load AI settings", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchKeys = useCallback(async (providerId: string) => {
    try {
      setKeys(await api.aiProviders.keys(providerId));
    } catch (err) {
      console.error("Failed to load API keys", err);
      setKeys([]);
    }
  }, []);

  useEffect(() => {
    if (editingId) fetchKeys(editingId);
    else setKeys([]);
  }, [editingId, fetchKeys]);

  const handleAddKey = async () => {
    if (!editingId || !keyForm.apiKey.trim()) return;
    setSavingKey(true);
    try {
      await api.aiProviders.addKey(editingId, {
        apiKey: keyForm.apiKey.trim(),
        label: keyForm.label.trim() || undefined,
      });
      setKeyForm({ apiKey: "", label: "" });
      await fetchKeys(editingId);
      fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!editingId) return;
    if (!confirm("Remove this API key?")) return;
    try {
      await api.aiProviders.deleteKey(editingId, keyId);
      await fetchKeys(editingId);
      fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete key");
    }
  };

  const handleTypeChange = (type: string) => {
    const preset = PROVIDER_PRESETS[type] || PROVIDER_PRESETS.CUSTOM;
    setForm(prev => ({ ...prev, providerType: type, baseUrl: preset.baseUrl, defaultModel: preset.model }));
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const payload = form.apiKey ? form : { ...form, apiKey: undefined };
        await api.aiProviders.update(editingId, payload);
      } else {
        await api.aiProviders.create(form);
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save provider");
    }
  };

  const handleEdit = (p: AiProviderApi) => {
    setForm({
      name: p.name,
      providerType: p.providerType,
      apiKey: "",
      baseUrl: p.baseUrl,
      defaultModel: p.defaultModel,
    });
    setKeyForm({ apiKey: "", label: "" });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    try {
      await api.aiProviders.delete(id);
      fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleSetActive = async (id: string | null) => {
    try {
      await api.aiProviders.updateSettings({ activeProviderId: id });
      fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  const handleTest = async () => {
    if (!testMsg.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.aiProviders.test(testMsg);
      setTestResult(result.success ? `OK: ${result.response}` : `Error: ${result.error}`);
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : "Test failed"}`);
    } finally {
      setTesting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", providerType: "OPENAI", apiKey: "", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" });
  };

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  if (loading) {
    return <div className="p-8 font-mono text-xs text-center" style={{ color: "var(--text-3)" }}>Loading AI settings...</div>;
  }

  return (
    <div className="flex h-full">
      {/* Provider list */}
      <div className="w-72 shrink-0 flex flex-col border-r" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-2)" }}>AI PROVIDERS</div>
            <button
              onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
              className="font-mono text-xs px-2 py-1 transition-colors"
              style={{ color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "2px" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-2)"; }}
            >
              + Add
            </button>
          </div>
          <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
            Active: {settings?.activeProviderName || "None (using .env)"}
          </div>
        </div>
        <div className="flex-1 scrollable">
          {providers.length === 0 ? (
            <div className="px-4 py-6 font-mono text-xs text-center" style={{ color: "var(--text-3)" }}>
              No providers configured
            </div>
          ) : (
            providers.map((p) => {
              const isActive = settings?.activeProviderId === p.id;
              return (
                <div
                  key={p.id}
                  className="px-4 py-3 border-b cursor-pointer transition-colors"
                  style={{
                    borderColor: "var(--border-faint)",
                    background: isActive ? "var(--accent-soft)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                  onClick={() => handleEdit(p)}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--hover)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{p.name}</span>
                    {isActive && (
                      <span className="font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: "var(--accent)", color: "#000" }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>{p.providerType} — {p.defaultModel}</div>
                  <div className="font-mono text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                    {p.keyCount} key{p.keyCount === 1 ? "" : "s"} · {p.apiKeyMasked}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* .env fallback notice */}
        <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
            Fallback: AI_API_KEY from .env
          </div>
        </div>
      </div>

      {/* Editor / Detail */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--bg)" }}>
        {showForm ? (
          <div className="scrollable px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                {editingId ? "Edit Provider" : "Add Provider"}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
                Cancel
              </button>
            </div>

            <div className="max-w-lg space-y-4">
              <div>
                <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>NAME</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My OpenAI Key"
                  className="w-full px-3 py-2 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              <div>
                <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>PROVIDER TYPE</label>
                <select
                  value={form.providerType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono outline-none cursor-pointer"
                  style={{ ...inputStyle, appearance: "auto" }}
                >
                  <option value="OPENAI">OpenAI</option>
                  <option value="ANTHROPIC">Anthropic (Claude)</option>
                  <option value="GEMINI">Google Gemini</option>
                  <option value="DEEPSEEK">DeepSeek</option>
                  <option value="OPENROUTER">OpenRouter (auto)</option>
                  <option value="CUSTOM">Custom (OpenAI-compatible)</option>
                </select>
              </div>

              {!editingId && (
                <div>
                  <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>API KEY</label>
                  <input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 text-sm font-mono outline-none transition-colors"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                  <div className="font-mono text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                    You can add more keys after saving — the healthiest one is used automatically.
                  </div>
                </div>
              )}

              <div>
                <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>BASE URL</label>
                <input
                  value={form.baseUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-mono outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              <div>
                <label className="block font-mono text-xs tracking-wider mb-1.5" style={{ color: "var(--text-2)" }}>DEFAULT MODEL</label>
                <input
                  value={form.defaultModel}
                  onChange={(e) => setForm(prev => ({ ...prev, defaultModel: e.target.value }))}
                  className="w-full px-3 py-2 text-sm font-mono outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!form.name || !form.apiKey && !editingId}
                  className="px-4 py-2 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {editingId ? "Update Provider" : "Add Provider"}
                </button>
                {editingId && (
                  <>
                    <button
                      onClick={() => handleSetActive(editingId)}
                      className="px-4 py-2 text-xs font-mono rounded-sm transition-colors"
                      style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
                    >
                      Set as Active
                    </button>
                    <button
                      onClick={() => { handleDelete(editingId); setShowForm(false); setEditingId(null); }}
                      className="px-4 py-2 text-xs font-mono rounded-sm transition-colors"
                      style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* API keys (edit mode) */}
            {editingId && (
              <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="font-mono text-xs tracking-wider mb-3" style={{ color: "var(--text-2)" }}>
                  API KEYS ({keys.length}) — THE HEALTHIEST KEY IS USED AUTOMATICALLY
                </div>
                {keys.length === 0 ? (
                  <div className="font-mono text-xs mb-3" style={{ color: "var(--text-3)" }}>No keys yet</div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {keys.map((k) => {
                      const cooling = k.disabledUntil && new Date(k.disabledUntil).getTime() > Date.now();
                      return (
                        <div key={k.id} className="flex items-center gap-3 px-3 py-2" style={{ border: "1px solid var(--border)", borderRadius: "3px", background: "var(--panel-2)" }}>
                          <span className="font-mono text-xs" style={{ color: "var(--text-2)" }}>
                            {k.label || "key"} · {k.apiKeyMasked}
                          </span>
                          <span
                            className="font-mono px-1.5 py-0.5 rounded-sm"
                            style={{
                              fontSize: "9px",
                              background: cooling ? "var(--badge-danger-bg)" : "var(--badge-success-bg)",
                              color: cooling ? "var(--badge-danger-text)" : "var(--badge-success-text)",
                            }}
                          >
                            {cooling ? "COOLING DOWN" : k.failureCount > 0 ? "RECOVERED" : "HEALTHY"}
                          </span>
                          {k.lastError && (
                            <span className="font-mono text-xs truncate flex-1" style={{ color: "var(--text-faint)" }} title={k.lastError}>
                              {k.lastError}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="font-mono text-xs ml-auto shrink-0"
                            style={{ color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyForm.apiKey}
                    onChange={(e) => setKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Add another API key (sk-...)"
                    className="flex-1 px-3 py-2 text-sm font-mono outline-none transition-colors"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                  <input
                    value={keyForm.label}
                    onChange={(e) => setKeyForm(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="label"
                    className="w-28 px-3 py-2 text-sm font-mono outline-none transition-colors"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                  <button
                    onClick={handleAddKey}
                    disabled={savingKey || !keyForm.apiKey.trim()}
                    className="px-4 py-2 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    {savingKey ? "Adding..." : "Add Key"}
                  </button>
                </div>
                <div className="font-mono text-xs mt-2" style={{ color: "var(--text-faint)" }}>
                  Keys rejected by the provider (401/403) cool down for 15 min; rate-limited keys (429) for 60 s. Failover is automatic.
                </div>
              </div>
            )}

            {/* Test section */}
            <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="font-mono text-xs tracking-wider mb-3" style={{ color: "var(--text-2)" }}>TEST CONNECTION</div>
              <div className="flex gap-2">
                <input
                  value={testMsg}
                  onChange={(e) => setTestMsg(e.target.value)}
                  placeholder="Say hello to test the connection..."
                  className="flex-1 px-3 py-2 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTest(); }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                <button
                  onClick={handleTest}
                  disabled={testing || !testMsg.trim()}
                  className="px-4 py-2 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
                  style={{ background: "var(--panel-3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                >
                  {testing ? "Testing..." : "Test"}
                </button>
              </div>
              {testResult && (
                <div className="mt-2 px-3 py-2 font-mono text-xs rounded-sm" style={{
                  background: testResult.startsWith("OK") ? "var(--badge-success-bg)" : "var(--badge-danger-bg)",
                  color: testResult.startsWith("OK") ? "var(--badge-success-text)" : "var(--badge-danger-text)",
                }}>
                  {testResult}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center" style={{ color: "var(--text-3)" }}>
            <div className="font-mono text-xs tracking-widest mb-2">AI PROVIDER SETTINGS</div>
            <div className="text-sm mb-4">Select a provider to edit or add a new one</div>
            <div className="text-xs max-w-md text-center" style={{ color: "var(--text-faint)" }}>
              Configure AI providers here. API keys are encrypted and stored in the database.
              If no provider is active, the system falls back to the AI_API_KEY environment variable.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
