"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type TaxonomyApiNode } from "@/lib/api";

const BADGE_VARS: Record<string, { bg: string; text: string; label: string }> = {
  category: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", label: "CAT" },
  subcategory: { bg: "var(--badge-info-bg)", text: "var(--badge-info-text)", label: "SUB" },
  course: { bg: "var(--badge-neutral-bg)", text: "var(--badge-neutral-text)", label: "COURSE" },
};

type NodeType = "category" | "subcategory" | "course";

interface TreeNodeProps {
  node: TaxonomyApiNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: TaxonomyApiNode) => void;
  onToggle: (id: string) => void;
  onAdd: (parentId: string, type: NodeType) => void;
  onDelete: (id: string) => void;
  siblings: TaxonomyApiNode[];
}

function TreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  onAdd,
  onDelete,
  siblings,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const selected = selectedId === node.id;
  const badge = BADGE_VARS[node.nodeType] || BADGE_VARS.course;

  const addChildType: NodeType | null =
    node.nodeType === "category" ? "subcategory" :
    node.nodeType === "subcategory" ? "course" : null;

  return (
    <div>
      <div
        className="group flex items-center gap-2 pr-2 cursor-pointer transition-colors"
        style={{
          paddingLeft: `${8 + depth * 20}px`,
          paddingTop: "6px",
          paddingBottom: "6px",
          background: selected ? "var(--accent-soft)" : "transparent",
          borderLeft: selected ? "3px solid var(--accent)" : "3px solid transparent",
        }}
        onClick={() => onSelect(node)}
        onMouseEnter={(e) => {
          if (!selected) e.currentTarget.style.background = "var(--hover)";
        }}
        onMouseLeave={(e) => {
          if (!selected) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Expand/collapse arrow */}
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0 transition-transform"
          style={{ color: "var(--text-3)", fontSize: "10px" }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : <span style={{ opacity: 0 }}>▸</span>}
        </button>

        {/* Icon */}
        {node.icon && (
          <span className="text-sm shrink-0">{node.icon}</span>
        )}

        {/* Name */}
        <span
          className="flex-1 text-sm truncate"
          style={{ color: depth === 0 ? "var(--text)" : "var(--text-2)", fontWeight: depth === 0 ? 600 : 400 }}
        >
          {node.name}
        </span>

        {/* Badges */}
        <span
          className="font-mono shrink-0 px-1.5 py-0.5 rounded-sm"
          style={{ fontSize: "9px", background: badge.bg, color: badge.text, letterSpacing: "0.04em" }}
        >
          {badge.label}
        </span>

        {!node.isActive && (
          <span className="font-mono px-1 py-0.5 rounded-sm" style={{ fontSize: "8px", background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)" }}>
            OFF
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {addChildType && (
            <button
              title={`Add ${addChildType}`}
              onClick={() => onAdd(node.id, addChildType)}
              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
              style={{ color: "var(--text-2)", fontSize: "14px", lineHeight: 1 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-soft)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-2)";
              }}
            >
              +
            </button>
          )}
          <button
            title="Delete"
            onClick={() => onDelete(node.id)}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-faint)", fontSize: "12px" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--danger-soft)";
              e.currentTarget.style.color = "var(--danger)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-faint)";
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              onAdd={onAdd}
              onDelete={onDelete}
              siblings={node.children!}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function TaxonomyManager() {
  const [tree, setTree] = useState<TaxonomyApiNode[]>([]);
  const [selected, setSelected] = useState<TaxonomyApiNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<NodeType>("course");
  const [newLabel, setNewLabel] = useState("");

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.taxonomy.list();
      setTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load taxonomy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleSelect = (node: TaxonomyApiNode) => {
    setSelected(node);
    setEditLabel(node.name);
    setEditDescription(node.description || "");
    setEditDirty(false);
    setSaved(false);
    setAddingTo(null);
  };

  const handleToggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await api.taxonomy.update(selected.id, {
        name: editLabel,
        slug: slugify(editLabel),
        description: editDescription,
      });
      setSelected((prev) => (prev ? { ...prev, name: editLabel, description: editDescription } : null));
      setEditDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetchTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleAdd = (parentId: string, type: NodeType) => {
    setAddingTo(parentId);
    setAddingType(type);
    setNewLabel("");
    setSelected(null);
    setSaved(false);
    setExpanded((prev) => new Set([...prev, parentId]));
  };

  const handleAddRoot = () => {
    setAddingTo("__root__");
    setAddingType("category");
    setNewLabel("");
    setSelected(null);
  };

  const handleConfirmAdd = async () => {
    if (!newLabel.trim()) return;
    try {
      const data: Record<string, unknown> = {
        nodeType: addingType,
        name: newLabel.trim(),
        slug: slugify(newLabel.trim()),
      };
      if (addingTo !== "__root__") {
        data.parentNodeId = addingTo;
      }
      await api.taxonomy.create(data as Parameters<typeof api.taxonomy.create>[0]);
      setAddingTo(null);
      setNewLabel("");
      fetchTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add node");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this node? This cannot be undone.")) return;
    try {
      await api.taxonomy.delete(id);
      if (selected?.id === id) setSelected(null);
      fetchTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: "var(--text-3)" }}>
        <div className="font-mono text-xs tracking-wider">Loading taxonomy...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Tree panel */}
      <div className="w-72 shrink-0 flex flex-col border-r" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <span className="font-mono text-xs tracking-wider" style={{ color: "var(--text-2)" }}>
            TAXONOMY TREE
          </span>
          <button
            onClick={handleAddRoot}
            className="font-mono text-xs px-2 py-1 transition-colors"
            style={{ color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "2px" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.color = "#000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-2)";
            }}
          >
            + New
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 font-mono text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div className="flex-1 scrollable py-1">
          {tree.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-sm mb-2" style={{ color: "var(--text-3)" }}>No categories yet</div>
              <button
                onClick={handleAddRoot}
                className="font-mono text-xs px-3 py-2 transition-colors"
                style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
              >
                + Create First Category
              </button>
            </div>
          ) : (
            tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selected?.id ?? null}
                expandedIds={expanded}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onAdd={handleAdd}
                onDelete={handleDelete}
                siblings={tree}
              />
            ))
          )}

          {/* Inline add form */}
          {addingTo && (
            <div
              className="mx-2 my-1 p-3 space-y-2"
              style={{
                background: "var(--accent-soft)",
                border: "1px solid var(--accent-soft-border)",
                borderRadius: "3px",
              }}
            >
              <div className="font-mono text-xs" style={{ color: "var(--accent-soft-text)" }}>
                NEW {addingType.toUpperCase()}
              </div>
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={`${addingType} name...`}
                className="w-full px-2 py-1.5 text-sm outline-none"
                style={{
                  border: "1px solid var(--accent-soft-border)",
                  borderRadius: "2px",
                  background: "var(--panel)",
                  color: "var(--text)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmAdd();
                  if (e.key === "Escape") setAddingTo(null);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmAdd}
                  className="font-mono text-xs px-3 py-1.5 transition-colors"
                  style={{ background: "var(--accent)", color: "#000", borderRadius: "2px" }}
                >
                  Add
                </button>
                <button
                  onClick={() => setAddingTo(null)}
                  className="font-mono text-xs px-3 py-1.5 transition-colors"
                  style={{ color: "var(--text-2)", border: "1px solid var(--accent-soft-border)", borderRadius: "2px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit panel */}
      <div className="flex-1 scrollable" style={{ background: "var(--bg)" }}>
        {selected ? (
          <div className="p-8 max-w-xl">
            <div className="mb-6">
              <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                EDITING {selected.nodeType.toUpperCase()}
              </div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                {selected.name}
              </h2>
            </div>

            <div className="p-6 space-y-5" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px" }}>
              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-2)" }}>
                  NAME
                </label>
                <input
                  value={editLabel}
                  onChange={(e) => {
                    setEditLabel(e.target.value);
                    setEditDirty(true);
                    setSaved(false);
                  }}
                  className="w-full px-3 py-2 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-2)" }}>
                  DESCRIPTION
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => {
                    setEditDescription(e.target.value);
                    setEditDirty(true);
                    setSaved(false);
                  }}
                  rows={3}
                  className="w-full px-3 py-2 text-sm outline-none transition-colors resize-none"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>

              <div className="pt-1 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!editDirty}
                  className="font-mono text-xs px-4 py-2 transition-all"
                  style={{
                    background: editDirty ? "var(--btn-strong)" : "var(--border)",
                    color: editDirty ? "var(--btn-strong-fg)" : "var(--text-3)",
                    borderRadius: "3px",
                    cursor: editDirty ? "pointer" : "default",
                  }}
                >
                  SAVE CHANGES
                </button>
                {saved && (
                  <span className="font-mono text-xs" style={{ color: "var(--ok)" }}>
                    Saved
                  </span>
                )}
              </div>
            </div>

            {/* Children summary */}
            {selected.children && selected.children.length > 0 && (
              <div className="mt-6">
                <div className="font-mono text-xs tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
                  CHILDREN ({selected.children.length})
                </div>
                <div className="space-y-1">
                  {selected.children.map((child) => {
                    const badge = BADGE_VARS[child.nodeType] || BADGE_VARS.course;
                    return (
                      <div
                        key={child.id}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "3px" }}
                        onClick={() => handleSelect(child)}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      >
                        {child.icon && <span className="text-sm">{child.icon}</span>}
                        <span className="text-sm flex-1" style={{ color: "var(--text-2)" }}>{child.name}</span>
                        <span className="font-mono px-1.5 py-0.5 rounded-sm" style={{ fontSize: "9px", background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                        <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>&rarr;</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick add child */}
            {selected.nodeType !== "course" && (
              <div className="mt-4">
                <button
                  onClick={() => handleAdd(selected.id, selected.nodeType === "category" ? "subcategory" : "course")}
                  className="w-full font-mono text-xs py-3 transition-colors"
                  style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text-3)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--text-faint)"; e.currentTarget.style.color = "var(--text-3)"; }}
                >
                  + Add {selected.nodeType === "category" ? "Subcategory" : "Course"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center" style={{ color: "var(--text-3)" }}>
            <div className="text-4xl mb-3">📂</div>
            <div className="font-mono text-xs tracking-widest mb-2">NO NODE SELECTED</div>
            <div className="text-sm">Click a node in the tree to edit it</div>
          </div>
        )}
      </div>
    </div>
  );
}
