"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type CampusBookApi, type CampusBookListApi } from "@/lib/api";

export default function CampusLibraryManager() {
  const [books, setBooks] = useState<CampusBookApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");

  const fetchBooks = useCallback(
    (p: number, q: string, f: string) =>
      Promise.resolve()
        .then(() => {
          setLoading(true);
          return api.campusBooks.list({ page: p, limit: 20, search: q || undefined, filter: f });
        })
        .then((data: CampusBookListApi) => {
          setBooks(data.books);
          setTotalPages(data.totalPages);
          setTotal(data.total);
        })
        .catch((err) => {
          console.error("Failed to load campus books", err);
        })
        .finally(() => {
          setLoading(false);
        }),
    []
  );

  useEffect(() => { fetchBooks(page, search, filter); }, [page, search, filter, fetchBooks]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.campusBooks.sync();
      alert(result.message);
      fetchBooks(page, search, filter);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleTogglePremium = async (campusBookId: string, current: boolean) => {
    try {
      await api.campusBooks.updateSettings(campusBookId, { isPremium: !current });
      setBooks(prev => prev.map(b =>
        b.campusBookId === campusBookId ? { ...b, isPremium: !current } : b
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleToggleFeatured = async (campusBookId: string, current: boolean) => {
    try {
      await api.campusBooks.updateSettings(campusBookId, { isFeatured: !current });
      setBooks(prev => prev.map(b =>
        b.campusBookId === campusBookId ? { ...b, isFeatured: !current } : b
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--text)" }}>Campus Library</div>
          <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
            {total} books from campuslibrary.xyz
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search books..."
            className="px-3 py-1.5 text-sm font-mono outline-none"
            style={{ ...inputStyle, width: 200 }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
          <div className="flex gap-1">
            {(["all", "free", "premium"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="font-mono text-xs px-2.5 py-1.5 transition-colors"
                style={{
                  background: filter === f ? "var(--accent)" : "transparent",
                  color: filter === f ? "#000" : "var(--text-3)",
                  border: "1px solid " + (filter === f ? "var(--accent)" : "var(--border)"),
                  borderRadius: "3px",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="font-mono text-xs px-3 py-1.5 transition-colors disabled:opacity-40"
            style={{ background: "var(--panel-3)", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "3px" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
          >
            {syncing ? "Syncing..." : "⟳ Sync from CampusLibrary"}
          </button>
        </div>
      </div>

      {/* Books grid */}
      <div className="flex-1 scrollable px-6 py-4">
        {loading ? (
          <div className="py-12 text-center font-mono text-xs" style={{ color: "var(--text-3)" }}>Loading books...</div>
        ) : books.length === 0 ? (
          <div className="py-12 text-center">
            <div className="font-mono text-xs tracking-widest mb-2" style={{ color: "var(--text-3)" }}>NO BOOKS FOUND</div>
            <div className="text-sm" style={{ color: "var(--text-faint)" }}>
              {books.length === 0 ? 'Click "Sync from CampusLibrary" to import books' : "No books match the current filter"}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {books.map((book) => (
              <div
                key={book.campusBookId}
                className="rounded-sm overflow-hidden transition-all"
                style={{ background: "var(--panel)", border: "1px solid " + (book.isPremium ? "var(--accent)" : "var(--border)") }}
              >
                {/* Cover */}
                <div className="relative" style={{ aspectRatio: "3/2", background: "var(--panel-3)" }}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-xs" style={{ color: "var(--text-faint)" }}>
                      No Cover
                    </div>
                  )}
                  {book.isPremium && (
                    <span className="absolute top-2 right-2 font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: "var(--accent)", color: "#000" }}>
                      PREMIUM
                    </span>
                  )}
                  {book.isFeatured && (
                    <span className="absolute top-2 left-2 font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: "var(--badge-success-bg)", color: "var(--badge-success-text)" }}>
                      FEATURED
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="text-sm font-medium truncate mb-1" style={{ color: "var(--text)" }}>{book.title}</div>
                  <div className="font-mono text-xs truncate mb-2" style={{ color: "var(--text-3)" }}>{book.author}</div>
                  <div className="flex items-center gap-2 mb-2">
                    {book.category && (
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: "var(--panel-3)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
                        {book.category}
                      </span>
                    )}
                    {book.rating != null && (
                      <span className="font-mono text-xs" style={{ color: "var(--text-3)", fontSize: "10px" }}>
                        ★ {book.rating.toFixed(1)}
                      </span>
                    )}
                    {book.pageCount && (
                      <span className="font-mono text-xs" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                        {book.pageCount} pg
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePremium(book.campusBookId, book.isPremium)}
                      className="flex-1 font-mono text-xs py-1.5 transition-colors"
                      style={{
                        background: book.isPremium ? "var(--accent)" : "transparent",
                        color: book.isPremium ? "#000" : "var(--text-3)",
                        border: "1px solid " + (book.isPremium ? "var(--accent)" : "var(--border)"),
                        borderRadius: "3px",
                      }}
                    >
                      {book.isPremium ? "Premium" : "Free"}
                    </button>
                    <button
                      onClick={() => handleToggleFeatured(book.campusBookId, book.isFeatured)}
                      className="font-mono text-xs px-2 py-1.5 transition-colors"
                      style={{
                        background: book.isFeatured ? "var(--badge-success-bg)" : "transparent",
                        color: book.isFeatured ? "var(--badge-success-text)" : "var(--text-3)",
                        border: "1px solid " + (book.isFeatured ? "var(--badge-success-text)" : "var(--border)"),
                        borderRadius: "3px",
                      }}
                    >
                      ★
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t flex items-center justify-center gap-2" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="font-mono text-xs px-2 py-1 disabled:opacity-30"
            style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-3)" }}
          >
            ←
          </button>
          <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
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
