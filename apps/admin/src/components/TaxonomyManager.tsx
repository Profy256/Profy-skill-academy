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
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
  siblings: TaxonomyApiNode[];
  parentId: string | null;
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
  parentId,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const selected = selectedId === node.id;
  const badge = BADGE_VARS[node.nodeType] || BADGE_VARS.course;
  const idx = siblings.findIndex((s) => s.id === node.id);

  return (
    <div>
      <div
        className="group flex items-center gap-1 pr-2 cursor-pointer transition-colors"
        style={{
          paddingLeft: `${8 + depth * 16}px`,
          paddingTop: "5px",
          paddingBottom: "5px",
          background: selected ? "var(--accent-soft)" : "transparent",
          borderLeft: selected ? "2px solid var(--accent)" : "2px solid transparent",
        }}
        onClick={() => onSelect(node)}
        onMouseEnter={(e) => {
          if (!selected) e.currentTarget.style.background = "var(--hover)";
        }}
        onMouseLeave={(e) => {
          if (!selected) e.currentTarget.style.background = "transparent";
        }}
      >
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

        <span
          className="flex-1 text-sm truncate"
          style={{ color: depth === 0 ? "var(--text)" : "var(--text-2)", fontWeight: depth === 0 ? 600 : 400 }}
        >
          {node.name}
        </span>

        {!node.isActive && (
          <span className="font-mono px-1 py-0.5 rounded-sm mr-1" style={{ fontSize: "8px", background: "var(--badge-danger-bg)", color: "var(--badge-danger-text)" }}>
            OFF
          </span>
        )}

        <span
          className="font-mono shrink-0 px-1 py-0.5 rounded-sm"
          style={{ fontSize: "9px", background: badge.bg, color: badge.text, letterSpacing: "0.04em" }}
        >
          {badge.label}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1" onClick={(e) => e.stopPropagation()}>
          {(node.nodeType === "category" || node.nodeType === "subcategory") && (
            <button
              title="Add child"
              onClick={() => onAdd(node.id)}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors"
              style={{ color: "var(--text-2)", fontSize: "13px", lineHeight: 1 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--panel-3)";
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
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-faint)", fontSize: "11px" }}
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
              parentId={node.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_SEQUENCE: NodeType[] = ["category", "subcategory", "course"];

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
  const [editType, setEditType] = useState<NodeType>("course");
  const [editDescription, setEditDescription] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<NodeType>("course");

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
    setEditType(node.nodeType as NodeType);
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
      setSelected((prev) => (prev ? { ...prev, name: editLabel, nodeType: editType, description: editDescription } : null));
      setEditDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetchTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleAdd = (parentId: string) => {
    setAddingTo(parentId);
    setNewLabel("");
    setNewType("course");
    setSelected(null);
    setSaved(false);
    setExpanded((prev) => new Set([...prev, parentId]));
  };

  const handleAddRoot = () => {
    setAddingTo("__root__");
    setNewLabel("");
    setNewType("category");
    setSelected(null);
  };

  const handleConfirmAdd = async () => {
    if (!newLabel.trim()) return;
    try {
      const data: Record<string, unknown> = {
        nodeType: newType,
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
              e.currentTarget.style.background = "var(--panel-3)";
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-2)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            + Category
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 font-mono text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div className="flex-1 scrollable py-1">
          {tree.map((node) => (
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
              parentId={null}
            />
          ))}

          {addingTo === "__root__" && (
            <NewNodeForm
              label={newLabel}
              type={newType}
              onLabelChange={setNewLabel}
              onTypeChange={setNewType}
              onConfirm={handleConfirmAdd}
              onCancel={() => setAddingTo(null)}
              depth={0}
              allowedTypes={["category"]}
            />
          )}
        </div>
      </div>

      {/* Edit panel */}
      <div className="flex-1 scrollable" style={{ background: "var(--bg)" }}>
        {selected ? (
          <div className="p-8 max-w-xl">
            <div className="mb-6">
              <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                EDITING NODE
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
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.background = "var(--panel)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--panel-2)";
                  }}
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
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.background = "var(--panel)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--panel-2)";
                  }}
                />
              </div>

              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-2)" }}>
                  NODE TYPE
                </label>
                <select
                  value={editType}
                  onChange={(e) => {
                    setEditType(e.target.value as NodeType);
                    setEditDirty(true);
                    setSaved(false);
                  }}
                  className="w-full px-3 py-2 text-sm outline-none cursor-pointer"
                  style={{ ...inputStyle, appearance: "auto" }}
                >
                  {TYPE_SEQUENCE.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="font-mono text-xs mt-1.5" style={{ color: "var(--text-3)" }}>
                  Slug: {slugify(editLabel || selected.name)}
                </p>
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
                  onMouseEnter={(e) => {
                    if (editDirty) e.currentTarget.style.background = "var(--btn-strong-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = editDirty ? "var(--btn-strong)" : "var(--border)";
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--accent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                        }}
                      >
                        <span className="text-sm flex-1" style={{ color: "var(--text-2)" }}>
                          {child.name}
                        </span>
                        <span className="font-mono px-1 py-0.5 rounded-sm" style={{ fontSize: "9px", background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                        <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>&rarr;</span>
                      </div>
                    );
                  })}
                </div>

                {addingTo === selected.id ? (
                  <NewNodeForm
                    label={newLabel}
                    type={newType}
                    onLabelChange={setNewLabel}
                    onTypeChange={setNewType}
                    onConfirm={handleConfirmAdd}
                    onCancel={() => setAddingTo(null)}
                    depth={0}
                    allowedTypes={selected.nodeType === "category" ? ["subcategory", "course"] : ["course"]}
                  />
                ) : (
                  <button
                    onClick={() => handleAdd(selected.id)}
                    className="mt-2 font-mono text-xs px-3 py-2 w-full text-left transition-colors"
                    style={{ color: "var(--text-3)", border: "1px dashed var(--text-faint)", borderRadius: "3px" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--text-faint)";
                      e.currentTarget.style.color = "var(--text-3)";
                    }}
                  >
                    + Add child node
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center" style={{ color: "var(--text-3)" }}>
            <div className="font-mono text-xs tracking-widest mb-2">NO NODE SELECTED</div>
            <div className="text-sm">Click a node in the tree to edit it</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface NewNodeFormProps {
  label: string;
  type: NodeType;
  onLabelChange: (v: string) => void;
  onTypeChange: (v: NodeType) => void;
  onConfirm: () => void;
  onCancel: () => void;
  depth: number;
  allowedTypes: NodeType[];
}

function NewNodeForm({ label, type, onLabelChange, onTypeChange, onConfirm, onCancel, depth, allowedTypes }: NewNodeFormProps) {
  return (
    <div
      className="mx-2 my-1 p-3 space-y-2"
      style={{
        background: "var(--accent-soft)",
        border: "1px solid var(--accent-soft-border)",
        borderRadius: "3px",
        marginLeft: `${8 + depth * 16}px`,
      }}
    >
      <div className="font-mono text-xs" style={{ color: "var(--accent-soft-text)" }}>
        NEW NODE
      </div>
      <input
        autoFocus
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Node label..."
        className="w-full px-2 py-1.5 text-sm outline-none"
        style={{
          border: "1px solid var(--accent-soft-border)",
          borderRadius: "2px",
          background: "var(--panel)",
          color: "var(--text)",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--accent-soft-border)";
        }}
      />
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value as NodeType)}
        className="w-full px-2 py-1.5 text-sm outline-none"
        style={{
          border: "1px solid var(--accent-soft-border)",
          borderRadius: "2px",
          background: "var(--panel)",
          color: "var(--text)",
        }}
      >
        {allowedTypes.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="font-mono text-xs px-3 py-1.5 transition-colors"
          style={{ background: "var(--accent)", color: "#000", borderRadius: "2px" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
          }}
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="font-mono text-xs px-3 py-1.5 transition-colors"
          style={{ color: "var(--text-2)", border: "1px solid var(--accent-soft-border)", borderRadius: "2px" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-soft)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
