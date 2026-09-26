"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type AdminBlogPost, type BlogPostInput, type BlogPostPage } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type StatusFilter = "all" | "draft" | "published" | "archived";
type BlogStatus = AdminBlogPost["status"];

interface PostForm {
  slug: string;
  title: string;
  excerpt: string;
  contentMd: string;
  coverImageUrl: string;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  status: BlogStatus;
}

const emptyForm: PostForm = {
  slug: "",
  title: "",
  excerpt: "",
  contentMd: "",
  coverImageUrl: "",
  tags: "",
  metaTitle: "",
  metaDescription: "",
  status: "draft",
};

function toForm(post: AdminBlogPost): PostForm {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "",
    contentMd: post.contentMd,
    coverImageUrl: post.coverImageUrl ?? "",
    tags: post.tags.join(", "),
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    status: post.status,
  };
}

function toInput(form: PostForm): BlogPostInput {
  return {
    slug: form.slug.trim() || undefined,
    title: form.title.trim(),
    excerpt: form.excerpt.trim() || undefined,
    contentMd: form.contentMd,
    coverImageUrl: form.coverImageUrl.trim() || undefined,
    tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    metaTitle: form.metaTitle.trim() || undefined,
    metaDescription: form.metaDescription.trim() || undefined,
    status: form.status,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(raw: string): string {
  let s = escapeHtml(raw);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^()\s]+)\)/g, (match, label: string, href: string) =>
    /^(https?:\/\/|\/|#|mailto:)/i.test(href)
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : match
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  return s;
}

function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(renderInline).join("<br />")}</p>`);
      para = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith("```")) {
      flushPara();
      i++;
      const code: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (!trimmed) {
      flushPara();
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushPara();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara();
      out.push("<hr />");
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushPara();
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${quote.map(renderInline).join("<br />")}</p></blockquote>`);
      continue;
    }

    const firstBullet = /^[-*+]\s+/.test(trimmed);
    const firstOrdered = /^\d+[.)]\s+/.test(trimmed);
    if (firstBullet || firstOrdered) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const bullet = /^[-*+]\s+(.*)$/.exec(t);
        const ordered = /^\d+[.)]\s+(.*)$/.exec(t);
        if (firstOrdered && ordered) items.push(ordered[1]);
        else if (firstBullet && bullet) items.push(bullet[1]);
        else break;
        i++;
      }
      const tag = firstOrdered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</${tag}>`);
      continue;
    }

    para.push(lines[i]);
    i++;
  }
  flushPara();
  return out.join("\n");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status: BlogStatus): React.CSSProperties {
  if (status === "published") {
    return { background: "var(--badge-success-bg)", color: "var(--badge-success-text)" };
  }
  if (status === "draft") {
    return { background: "var(--badge-warning-bg)", color: "var(--badge-warning-text)" };
  }
  return { background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)" };
}

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

interface EditorProps {
  form: PostForm;
  editingId: string | null;
  saving: boolean;
  error: string;
  notice: string;
  onChange: (next: PostForm) => void;
  onClose: () => void;
  onSave: () => void;
}

function PostEditor({ form, editingId, saving, error, notice, onChange, onClose, onSave }: EditorProps) {
  const html = useMemo(() => renderMarkdown(form.contentMd), [form.contentMd]);
  const published = form.status === "published" && form.slug;
  const set = (patch: Partial<PostForm>) => onChange({ ...form, ...patch });

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="shrink-0 px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-mono rounded-sm transition-colors"
          style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
        >
          ← Back
        </button>
        <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{ ...statusBadge(form.status), fontSize: "10px" }}>
          {form.status}
        </span>
        {published && (
          <a
            href={`${SITE_URL}/blog/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs underline"
            style={{ color: "var(--accent)" }}
          >
            View live ↗
          </a>
        )}
        <div className="ml-auto flex items-center gap-3">
          {error && (
            <span className="font-mono text-xs" style={{ color: "var(--danger)" }}>{error}</span>
          )}
          {notice && !error && (
            <span className="font-mono text-xs" style={{ color: "var(--ok)" }}>{notice}</span>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono rounded-sm"
            style={{ color: "var(--text-faint)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.title.trim()}
            className="px-4 py-1.5 text-xs font-mono rounded-sm transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Create post"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 min-w-0 border-r overflow-y-auto p-5 space-y-4" style={{ borderColor: "var(--border)" }}>
          <Field label="TITLE">
            <input
              type="text"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Post title"
              className={inputCls}
              style={fieldStyle}
              {...focusProps}
            />
          </Field>

          <Field label="SLUG" hint="Leave blank to derive it from the title server-side.">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => set({ slug: e.target.value })}
              placeholder="my-post-slug"
              className={inputCls}
              style={fieldStyle}
              {...focusProps}
            />
          </Field>

          <Field label="EXCERPT">
            <textarea
              value={form.excerpt}
              onChange={(e) => set({ excerpt: e.target.value })}
              rows={2}
              placeholder="Short summary shown in listings"
              className={inputCls + " resize-none"}
              style={fieldStyle}
              {...focusProps}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="COVER IMAGE URL">
              <input
                type="url"
                value={form.coverImageUrl}
                onChange={(e) => set({ coverImageUrl: e.target.value })}
                placeholder="https://..."
                className={inputCls}
                style={fieldStyle}
                {...focusProps}
              />
            </Field>
            <Field label="TAGS" hint="Comma separated">
              <input
                type="text"
                value={form.tags}
                onChange={(e) => set({ tags: e.target.value })}
                placeholder="ai, teaching, news"
                className={inputCls}
                style={fieldStyle}
                {...focusProps}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="META TITLE">
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) => set({ metaTitle: e.target.value })}
                placeholder="SEO title"
                className={inputCls}
                style={fieldStyle}
                {...focusProps}
              />
            </Field>
            <Field label="STATUS">
              <select
                value={form.status}
                onChange={(e) => set({ status: e.target.value as BlogStatus })}
                className={inputCls}
                style={fieldStyle}
                {...focusProps}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </Field>
          </div>

          <Field label="META DESCRIPTION">
            <textarea
              value={form.metaDescription}
              onChange={(e) => set({ metaDescription: e.target.value })}
              rows={2}
              placeholder="SEO description"
              className={inputCls + " resize-none"}
              style={fieldStyle}
              {...focusProps}
            />
          </Field>

          <Field label="CONTENT (MARKDOWN)">
            <textarea
              value={form.contentMd}
              onChange={(e) => set({ contentMd: e.target.value })}
              rows={20}
              placeholder="# Heading&#10;&#10;Write your post in **Markdown**."
              className={inputCls + " resize-y leading-relaxed"}
              style={fieldStyle}
              spellCheck
              {...focusProps}
            />
          </Field>
        </div>

        <div className="w-1/2 min-w-0 overflow-y-auto p-5" style={{ background: "var(--panel-3)" }}>
          <div className="font-mono text-xs tracking-widest mb-4" style={{ color: "var(--text-faint)" }}>
            LIVE PREVIEW
          </div>
          {form.title && (
            <div className="mb-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>{form.title}</div>
              {form.excerpt && (
                <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{form.excerpt}</div>
              )}
            </div>
          )}
          <div
            className="md-preview"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

export default function BlogManager() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data: BlogPostPage | null; error: string | null } | null>(null);
  const [form, setForm] = useState<PostForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const listKey = `${status}:${page}:${reload}`;

  useEffect(() => {
    let cancelled = false;
    api.blog
      .list({ status: status === "all" ? undefined : status, page, size: 10 })
      .then((data) => {
        if (!cancelled) setResult({ key: listKey, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            key: listKey,
            data: null,
            error: err instanceof Error ? err.message : "Failed to load posts",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [listKey, status, page]);

  const current = result && result.key === listKey ? result : null;
  const loading = !current;
  const loadError = current?.error ?? null;
  const data = current?.data ?? null;
  const posts = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const refetch = () => setReload((r) => r + 1);

  const changeStatusFilter = (next: StatusFilter) => {
    setStatus(next);
    setPage(0);
  };

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setFormError("");
    setNotice("");
  };

  const openEdit = async (post: AdminBlogPost) => {
    setBusyId(post.id);
    setFormError("");
    setNotice("");
    try {
      const full = await api.blog.get(post.id);
      setForm(toForm(full));
      setEditingId(full.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load post");
    } finally {
      setBusyId(null);
    }
  };

  const closeEditor = () => {
    setForm(null);
    setEditingId(null);
    setFormError("");
    setNotice("");
  };

  const handleSave = async () => {
    if (!form || !form.title.trim() || saving) return;
    setSaving(true);
    setFormError("");
    setNotice("");
    try {
      const input = toInput(form);
      const saved = editingId ? await api.blog.update(editingId, input) : await api.blog.create(input);
      setForm(toForm(saved));
      setEditingId(saved.id);
      setNotice("Saved");
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (post: AdminBlogPost) => {
    const next: BlogStatus = post.status === "published" ? "draft" : "published";
    setBusyId(post.id);
    try {
      await api.blog.setStatus(post.id, next);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (post: AdminBlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setBusyId(post.id);
    try {
      await api.blog.remove(post.id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setBusyId(null);
    }
  };

  if (form) {
    return (
      <PostEditor
        form={form}
        editingId={editingId}
        saving={saving}
        error={formError}
        notice={notice}
        onChange={setForm}
        onClose={closeEditor}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="shrink-0 px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-1">
          {(["all", "draft", "published", "archived"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => changeStatusFilter(f)}
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
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs" style={{ color: "var(--text-faint)" }}>
            {loading ? "Loading..." : `${data?.totalElements ?? posts.length} posts`}
          </span>
          <button
            onClick={openCreate}
            className="px-3 py-1.5 text-xs font-mono rounded-sm transition-colors"
            style={{ background: "#f59e0b", color: "#000" }}
          >
            + New post
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {loading ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--text-faint)" }}>
            Loading posts...
          </div>
        ) : loadError ? (
          <div className="text-center py-12 font-mono text-xs" style={{ color: "var(--danger)" }}>
            {loadError}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="font-mono text-sm" style={{ color: "var(--text-faint)" }}>No posts found</div>
            <div className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>
              {status === "all" ? "Create your first post to get started" : `No ${status} posts`}
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="rounded-sm border p-4 transition-colors"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                      {post.title}
                    </span>
                    <span
                      className="font-mono text-xs px-1.5 py-0.5 rounded-sm uppercase"
                      style={{ ...statusBadge(post.status), fontSize: "10px" }}
                    >
                      {post.status}
                    </span>
                    {post.status === "published" && (
                      <a
                        href={`${SITE_URL}/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs underline"
                        style={{ color: "var(--accent)", fontSize: "10px" }}
                      >
                        View live ↗
                      </a>
                    )}
                  </div>
                  <div className="font-mono text-xs mt-1 truncate" style={{ color: "var(--text-faint)" }}>
                    /blog/{post.slug}
                  </div>
                  {post.excerpt && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--text-3)" }}>
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                      Updated {formatDate(post.updatedAt)}
                    </span>
                    {post.readingTime && (
                      <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                        {post.readingTime}
                      </span>
                    )}
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-xs px-1.5 py-0.5 rounded-sm"
                        style={{ background: "var(--panel-3)", color: "var(--text-3)", border: "1px solid var(--border)", fontSize: "10px" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(post)}
                    disabled={busyId === post.id}
                    className="px-2.5 py-1.5 text-xs font-mono rounded-sm disabled:opacity-40"
                    style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => togglePublish(post)}
                    disabled={busyId === post.id}
                    className="px-2.5 py-1.5 text-xs font-mono rounded-sm disabled:opacity-40"
                    style={
                      post.status === "published"
                        ? { color: "var(--text-2)", border: "1px solid var(--border)" }
                        : { color: "#000", background: "var(--badge-success-text)", border: "1px solid var(--badge-success-text)" }
                    }
                  >
                    {post.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    disabled={busyId === post.id}
                    aria-label={`Delete ${post.title}`}
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
            </div>
          ))
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
