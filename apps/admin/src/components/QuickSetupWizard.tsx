"use client";

import { useState } from "react";
import { api, type TaxonomyApiNode } from "@/lib/api";

interface QuickSetupWizardProps {
  onDone: () => void;
}

type Step = "category" | "subcategories" | "courses" | "confirm" | "creating";

export default function QuickSetupWizard({ onDone }: QuickSetupWizardProps) {
  const [step, setStep] = useState<Step>("category");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [subcategories, setSubcategories] = useState<string[]>([""]);
  const [courses, setCourses] = useState<Record<number, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const addSubcategory = () => {
    setSubcategories([...subcategories, ""]);
    setCourses({ ...courses, [subcategories.length]: [] });
  };

  const removeSubcategory = (index: number) => {
    const newSubs = subcategories.filter((_, i) => i !== index);
    setSubcategories(newSubs);
    const newCourses = { ...courses };
    delete newCourses[index];
    // Re-index courses
    const reindexed: Record<number, string[]> = {};
    newSubs.forEach((_, i) => {
      reindexed[i] = newCourses[i] || [];
    });
    setCourses(reindexed);
  };

  const addCourseToSubcategory = (subIndex: number) => {
    const current = courses[subIndex] || [];
    setCourses({ ...courses, [subIndex]: [...current, ""] });
  };

  const removeCourseFromSubcategory = (subIndex: number, courseIndex: number) => {
    const current = courses[subIndex] || [];
    setCourses({ ...courses, [subIndex]: current.filter((_, i) => i !== courseIndex) });
  };

  const updateCourseInSubcategory = (subIndex: number, courseIndex: number, value: string) => {
    const current = [...(courses[subIndex] || [])];
    current[courseIndex] = value;
    setCourses({ ...courses, [subIndex]: current });
  };

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      setError("Category name is required");
      return;
    }

    const validSubs = subcategories.filter(s => s.trim());
    if (validSubs.length === 0) {
      setError("At least one subcategory is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Step 1: Create category with subcategories
      const catResult = await api.taxonomy.bulkCreate({
        categoryName: categoryName.trim(),
        categoryDescription: categoryDescription.trim(),
        categoryIcon: categoryIcon.trim(),
        subcategories: validSubs.map(s => s.trim()),
      });

      // Step 2: Add courses to each subcategory
      let allCourses = 0;
      for (let i = 0; i < catResult.subcategories.length; i++) {
        const subCourses = (courses[i] || []).filter(c => c.trim());
        if (subCourses.length > 0) {
          await api.taxonomy.bulkAddCourses(
            catResult.subcategories[i].subcategoryId,
            subCourses.map(c => c.trim())
          );
          allCourses += subCourses.length;
        }
      }

      setResult({
        category: categoryName,
        subcategories: validSubs.length,
        courses: allCourses,
      });
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create taxonomy");
    } finally {
      setCreating(false);
    }
  };

  const inputStyle = {
    border: "1px solid var(--border)",
    borderRadius: "3px",
    color: "var(--text)",
    background: "var(--panel-2)",
  } as React.CSSProperties;

  const renderStep = () => {
    switch (step) {
      case "category":
        return (
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                CATEGORY NAME *
              </label>
              <input
                autoFocus
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Programming"
                className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter" && categoryName.trim()) setStep("subcategories"); }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>
            <div>
              <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                DESCRIPTION (optional)
              </label>
              <input
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Brief description of this category"
                className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>
            <div>
              <label className="block font-mono text-xs tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                ICON (optional)
              </label>
              <input
                value={categoryIcon}
                onChange={(e) => setCategoryIcon(e.target.value)}
                placeholder="e.g., 💻 or code"
                className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>
            <button
              onClick={() => { if (categoryName.trim()) setStep("subcategories"); }}
              disabled={!categoryName.trim()}
              className="w-full font-mono text-xs py-3 transition-colors disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
            >
              Next: Add Subcategories →
            </button>
          </div>
        );

      case "subcategories":
        return (
          <div className="space-y-4">
            <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              Category: <span style={{ color: "var(--accent)" }}>{categoryName}</span>
            </div>
            <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-2)" }}>
              SUBCATEGORIES *
            </div>
            {subcategories.map((sub, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={sub}
                  onChange={(e) => {
                    const newSubs = [...subcategories];
                    newSubs[i] = e.target.value;
                    setSubcategories(newSubs);
                  }}
                  placeholder={`Subcategory ${i + 1}`}
                  className="flex-1 px-3 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                {subcategories.length > 1 && (
                  <button
                    onClick={() => removeSubcategory(i)}
                    className="w-8 h-8 flex items-center justify-center transition-colors"
                    style={{ color: "var(--text-faint)", borderRadius: "3px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addSubcategory}
              className="w-full font-mono text-xs py-2.5 transition-colors"
              style={{ border: "1px dashed var(--text-faint)", borderRadius: "3px", color: "var(--text-3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--text-faint)"; e.currentTarget.style.color = "var(--text-3)"; }}
            >
              + Add another subcategory
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("category")}
                className="flex-1 font-mono text-xs py-3 transition-colors"
                style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-2)" }}
              >
                ← Back
              </button>
              <button
                onClick={() => { if (subcategories.some(s => s.trim())) setStep("courses"); }}
                disabled={!subcategories.some(s => s.trim())}
                className="flex-1 font-mono text-xs py-3 transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
              >
                Next: Add Courses →
              </button>
            </div>
          </div>
        );

      case "courses":
        return (
          <div className="space-y-6">
            <div className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
              <span style={{ color: "var(--accent)" }}>{categoryName}</span>
              {" → "}
              <span style={{ color: "var(--text-2)" }}>{subcategories.filter(s => s.trim()).length} subcategories</span>
            </div>
            <div className="font-mono text-xs tracking-wider" style={{ color: "var(--text-2)" }}>
              ADD COURSES (optional)
            </div>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              You can add courses now or do it later. Courses are where lessons live.
            </p>
            {subcategories.map((sub, i) => {
              if (!sub.trim()) return null;
              return (
                <div key={i} className="p-3" style={{ background: "var(--panel-3)", border: "1px solid var(--border)", borderRadius: "3px" }}>
                  <div className="font-mono text-xs mb-2" style={{ color: "var(--text-2)" }}>
                    {sub}
                  </div>
                  {(courses[i] || []).map((course, j) => (
                    <div key={j} className="flex items-center gap-2 mb-2">
                      <input
                        value={course}
                        onChange={(e) => updateCourseInSubcategory(i, j, e.target.value)}
                        placeholder={`Course ${j + 1}`}
                        className="flex-1 px-2 py-1.5 text-sm outline-none transition-colors"
                        style={{ ...inputStyle, fontSize: "13px" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                      <button
                        onClick={() => removeCourseFromSubcategory(i, j)}
                        className="text-xs transition-colors"
                        style={{ color: "var(--text-faint)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addCourseToSubcategory(i)}
                    className="font-mono text-xs px-2 py-1.5 transition-colors"
                    style={{ border: "1px dashed var(--text-faint)", borderRadius: "2px", color: "var(--text-3)", fontSize: "10px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--text-faint)"; e.currentTarget.style.color = "var(--text-3)"; }}
                  >
                    + Add course
                  </button>
                </div>
              );
            })}
            <div className="flex gap-2">
              <button
                onClick={() => setStep("subcategories")}
                className="flex-1 font-mono text-xs py-3 transition-colors"
                style={{ border: "1px solid var(--border)", borderRadius: "3px", color: "var(--text-2)" }}
              >
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 font-mono text-xs py-3 transition-colors disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
              >
                {creating ? "Creating..." : "Create Everything"}
              </button>
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full" style={{ background: "var(--ok-soft)", fontSize: "32px" }}>
              ✓
            </div>
            <div className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>
              Created Successfully!
            </div>
            <div className="text-sm" style={{ color: "var(--text-2)" }}>
              <div><strong>{result.category}</strong></div>
              <div>{result.subcategories} subcategories</div>
              <div>{result.courses} courses</div>
            </div>
            <button
              onClick={onDone}
              className="w-full font-mono text-xs py-3 transition-colors"
              style={{ background: "var(--accent)", color: "#000", borderRadius: "3px" }}
            >
              Done - View Taxonomy
            </button>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <div className="font-mono text-xs tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
            QUICK SETUP WIZARD
          </div>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            Create Course Structure
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            Build your entire taxonomy in one go
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {["category", "subcategories", "courses", "confirm"].map((s, i) => {
            const isActive = s === step;
            const isDone = ["category", "subcategories", "courses", "confirm"].indexOf(step) > i;
            return (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs"
                  style={{
                    background: isActive ? "var(--accent)" : isDone ? "var(--ok)" : "var(--panel-3)",
                    color: isActive ? "#000" : isDone ? "#fff" : "var(--text-3)",
                    fontSize: "10px",
                  }}
                >
                  {isDone ? "✓" : i + 1}
                </div>
                {i < 3 && (
                  <div className="flex-1 h-px" style={{ background: isDone ? "var(--ok)" : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="p-6" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "4px" }}>
          {error && (
            <div className="mb-4 p-3 font-mono text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)", borderRadius: "3px" }}>
              {error}
            </div>
          )}
          {renderStep()}
        </div>

        <button
          onClick={onDone}
          className="mt-4 w-full font-mono text-xs py-2 transition-colors"
          style={{ color: "var(--text-3)" }}
        >
          Skip - Use manual editor instead
        </button>
      </div>
    </div>
  );
}
