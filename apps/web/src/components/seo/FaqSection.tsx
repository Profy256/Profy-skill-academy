"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  title?: string;
  items: FaqItem[];
}

export default function FaqSection({ title = "Frequently Asked Questions", items }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2
        className="text-xl font-semibold mb-4"
        style={{ color: "var(--text)" }}
      >
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="border rounded-sm overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ background: openIndex === i ? "var(--panel-2)" : "var(--panel)" }}
              onMouseEnter={(e) => { if (openIndex !== i) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { if (openIndex !== i) e.currentTarget.style.background = "var(--panel)"; }}
              aria-expanded={openIndex === i}
            >
              <span className="text-sm font-medium pr-4" style={{ color: "var(--text)" }}>
                {item.question}
              </span>
              <span
                className="text-lg shrink-0 transition-transform"
                style={{
                  color: "var(--text-3)",
                  transform: openIndex === i ? "rotate(45deg)" : "rotate(0deg)",
                }}
              >
                +
              </span>
            </button>
            {openIndex === i && (
              <div
                className="px-4 py-3 text-sm leading-relaxed border-t"
                style={{
                  color: "var(--text-2)",
                  borderColor: "var(--border)",
                  background: "var(--panel-2)",
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
