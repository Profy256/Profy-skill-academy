"use client";

import { useState } from "react";
import { taxonomy, type TaxNode, type NodeType } from "@/lib/mockData";

const BADGE_VARS: Record<NodeType, { bg: string; text: string; label: string }> = {
  category: { bg: "var(--badge-warning-bg)", text: "var(--badge-warning-text)", label: "CAT" },
  subcategory: { bg: "var(--badge-info-bg)", text: "var(--badge-info-text)", label: "SUB" },
  skill: { bg: "var(--badge-success-bg)", text: "var(--badge-success-text)", label: "SKILL" },
  course: { bg: "var(--badge-neutral-bg)", text: "var(--badge-neutral-text)", label: "COURSE" },
};

interface TreeNodeProps {
  node: TaxNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: TaxNode) => void;
  onToggle: (id: string) => void;
  onAdd: (parentId: string) => void;
  onMoveUp: (id: string, parentId: string | null) => void;
  onMoveDown: (id: string, parentId: string | null) => void;
  siblings: TaxNode[];
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
  onMoveUp,
  onMoveDown,
  siblings,
  parentId,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const selected = selectedId === node.id;
  const badge = BADGE_VARS[node.type];
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
        {/* Expand toggle */}
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

        {/* Label */}
        <span
          className="flex-1 text-sm truncate"
          style={{ color: depth === 0 ? "var(--text)" : "var(--text-2)", fontWeight: depth === 0 ? 600 : 400 }}
        >
          {node.label}
        </span>

        {/* Type badge */}
        <span
          className="font-mono shrink-0 px-1 py-0.5 rounded-sm"
          style={{ fontSize: "9px", background: badge.bg, color: badge.text, letterSpacing: "0.04em" }}
        >
          {badge.label}
        </span>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1" onClick={(e) => e.stopPropagation()}>
          <button
            title="Move up"
            onClick={() => onMoveUp(node.id, parentId)}
            disabled={idx === 0}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: idx === 0 ? "var(--text-faint)" : "var(--text-2)", fontSize: "11px" }}
            onMouseEnter={(e) => {
              if (idx !== 0) e.currentTarget.style.background = "var(--panel-3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ↑
          </button>
          <button
            title="Move down"
            onClick={() => onMoveDown(node.id, parentId)}
            disabled={idx === siblings.length - 1}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: idx === siblings.length - 1 ? "var(--text-faint)" : "var(--text-2)", fontSize: "11px" }}
            onMouseEnter={(e) => {
              if (idx !== siblings.length - 1) e.currentTarget.style.background = "var(--panel-3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ↓
          </button>
          {(node.type === "category" || node.type === "subcategory") && (
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
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              siblings={node.children!}
              parentId={node.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function moveNode(nodes: TaxNode[], id: string, dir: "up" | "down"): TaxNode[] {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx === -1) return nodes.map((n) => ({ ...n, children: n.children ? moveNode(n.children, id, dir) : undefined }));
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= nodes.length) return nodes;
  const next = [...nodes];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  return next;
}

const TYPE_SEQUENCE: NodeType[] = ["category", "subcategory", "course", "skill"];

export default function TaxonomyManager() {
  const [tree, setTree] = useState<TaxNode[]>(taxonomy);
  const [selected, setSelected] = useState<TaxNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["cat-1", "cat-2", "cat-3"]));
  const [editLabel, setEditLabel] = useState("");
  const [editType, setEditType] = useState<NodeType>("course");
  const [editDirty, setEditDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<NodeType>("course");

  const handleSelect = (node: TaxNode) => {
    setSelected(node);
    setEditLabel(node.label);
    setEditType(node.type);
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

  const updateNodeLabel = (nodes: TaxNode[], id: string, label: string, type: NodeType): TaxNode[] =>
    nodes.map((n) =>
      n.id === id
        ? { ...n, label, type }
        : { ...n, children: n.children ? updateNodeLabel(n.children, id, label, type) : undefined }
    );

  const handleSave = () => {
    if (!selected) return;
    setTree((prev) => updateNodeLabel(prev, selected.id, editLabel, editType));
    setSelected((prev) => (prev ? { ...prev, label: editLabel, type: editType } : null));
    setEditDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addChildNode = (nodes: TaxNode[], parentId: string, child: TaxNode): TaxNode[] =>
    nodes.map((n) =>
      n.id === parentId
        ? { ...n, children: [...(n.children || []), child] }
        : { ...n, children: n.children ? addChildNode(n.children, parentId, child) : undefined }
    );

  const handleAdd = (parentId: string) => {
    setAddingTo(parentId);
    setNewLabel("");
    setNewType("course");
    setSelected(null);
    setSaved(false);
    // Expand parent
    setExpanded((prev) => new Set([...prev, parentId]));
  };

  const handleAddRoot = () => {
    setAddingTo("__root__");
    setNewLabel("");
    setNewType("category");
    setSelected(null);
  };

  const handleConfirmAdd = () => {
    if (!newLabel.trim()) return;
    const child: TaxNode = {
      id: `node-${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      children: newType === "category" || newType === "subcategory" ? [] : undefined,
    };
    if (addingTo === "__root__") {
      setTree((prev) => [...prev, child]);
    } else {
      setTree((prev) => addChildNode(prev, addingTo!, child));
    }
    setAddingTo(null);
    setNewLabel("");
  };

  const handleMoveUp = (id: string, _parentId: string | null) => {
    setTree((prev) => moveNode(prev, id, "up"));
  };
  const handleMoveDown = (id: string, _parentId: string | null) => {
    setTree((prev) => moveNode(prev, id, "down"));
  };

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

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
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              siblings={tree}
              parentId={null}
            />
          ))}

          {/* Add-to-root form */}
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
                {selected.label}
              </h2>
            </div>

            <div className="p-6 space-y-5" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px" }}>
              <div>
                <label className="block font-mono text-xs mb-1.5 tracking-wider" style={{ color: "var(--text-2)" }}>
                  LABEL
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
                  Note: changing type does not automatically restructure children.
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
                    ✓ Saved
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
                    const badge = BADGE_VARS[child.type];
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
                          {child.label}
                        </span>
                        <span className="font-mono px-1 py-0.5 rounded-sm" style={{ fontSize: "9px", background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                        <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>→</span>
                      </div>
                    );
                  })}
                </div>

                {/* Add child form inline */}
                {addingTo === selected.id ? (
                  <NewNodeForm
                    label={newLabel}
                    type={newType}
                    onLabelChange={setNewLabel}
                    onTypeChange={setNewType}
                    onConfirm={handleConfirmAdd}
                    onCancel={() => setAddingTo(null)}
                    depth={0}
                    allowedTypes={selected.type === "category" ? ["subcategory", "course", "skill"] : ["course", "skill"]}
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
