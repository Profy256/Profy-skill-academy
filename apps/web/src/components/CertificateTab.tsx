"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkoutCertTest,
  fetchCertCreditStatus,
  fetchFinalTestState,
  submitFinalTest,
  type CertificateInfo,
  type FinalTestState,
} from "@/lib/api";

const FG = "var(--foreground)";
const FG_MUTED = "var(--muted-foreground)";
const BORDER = "var(--border)";
const CARD = "var(--card)";
const PRIMARY = "var(--primary)";
const ON_PRIMARY = "var(--on-primary)";
const SUCCESS = "var(--success)";

type Phase = "loading" | "locked" | "intro" | "test" | "result" | "signed-out";

export default function CertificateTab({ courseSlug }: { courseSlug: string }) {
  const [state, setState] = useState<FinalTestState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitFinalTest>> | null>(null);
  const [paying, setPaying] = useState(false);
  const [phone, setPhone] = useState("");
  const [pollNote, setPollNote] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Every state write lives in a promise callback: the effect that calls this
  // never sets state synchronously (React lint) and never blocks first paint.
  const load = useCallback(
    () =>
      fetchFinalTestState(courseSlug)
        .then((next) => {
          setState(next);
          setPhase(next.readyToAttempt ? "intro" : "locked");
        })
        .catch((e: unknown) => {
          const message = e instanceof Error ? e.message : "Could not load the test";
          if (/unauthorized|session expired|401/i.test(message)) setPhase("signed-out");
          else {
            setPhase("locked");
            setError(message);
          }
        }),
    [courseSlug]
  );

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [load]);

  async function startTest() {
    if (!state) return;
    setError(null);
    setAnswers({});
    setResult(null);
    setPhase("test");
  }

  async function submit() {
    if (!state) return;
    const missing = state.questions.some((_, i) => answers[i] === undefined);
    if (missing) {
      setError("Answer every question before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitFinalTest(courseSlug, {
        answers: state.questions.map((_, i) => answers[i]),
        confirmName: true,
      });
      setResult(res);
      setPhase("result");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your answers");
    } finally {
      setSubmitting(false);
    }
  }

  async function buyWithStripe() {
    if (!state) return;
    setPaying(true);
    setError(null);
    try {
      const res = await checkoutCertTest("stripe", {
        courseNodeId: state.courseId,
        successUrl: `${window.location.origin}/?credit=purchased`,
        cancelUrl: `${window.location.origin}/`,
      });
      if (res.checkoutUrl) window.location.href = res.checkoutUrl;
      else setError("Payment provider did not return a checkout URL.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setPaying(false);
    }
  }

  async function buyWithMarzPay() {
    if (!state) return;
    if (!phone.trim()) {
      setError("Enter the mobile money number to use.");
      return;
    }
    setPaying(true);
    setError(null);
    setPollNote("Check your phone and approve the payment…");
    try {
      const res = await checkoutCertTest("marzpay", {
        courseNodeId: state.courseId,
        phoneNumber: phone.trim(),
        country: "UG",
      });
      if (!res.reference) {
        setError("No payment reference was returned.");
        setPollNote(null);
        return;
      }
      const reference = res.reference;
      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        try {
          const status = await fetchCertCreditStatus("marzpay", reference);
          if (status.status === "unused") {
            setPollNote("Payment received — your attempt is unlocked.");
            await load();
            return;
          }
          if (status.status === "failed") {
            setPollNote(null);
            setError("The payment did not go through. Please try again.");
            return;
          }
        } catch {
          // transient network error — keep polling
        }
        if (attempts >= 20) {
          setPollNote(null);
          setError("Still waiting on the payment confirmation. Refresh in a moment.");
          return;
        }
        pollRef.current = setTimeout(poll, 3000);
      };
      pollRef.current = setTimeout(poll, 3000);
    } catch (e) {
      setPollNote(null);
      setError(e instanceof Error ? e.message : "Could not start payment");
    } finally {
      setPaying(false);
    }
  }

  if (phase === "loading") {
    return <p style={{ fontSize: 14, color: FG_MUTED, padding: "24px 0" }}>Loading certification details…</p>;
  }

  if (phase === "signed-out") {
    return (
      <div style={{ padding: "24px 0" }}>
        <p style={{ fontSize: 15, color: FG, lineHeight: 1.6 }}>
          Sign in to see your certification status, take the final test and earn a verifiable credential.
        </p>
      </div>
    );
  }

  if (!state) {
    return <p style={{ fontSize: 14, color: FG_MUTED }}>{error || "Certification is unavailable right now."}</p>;
  }

  if (phase === "result" && result) {
    return (
      <div className="flex flex-col gap-5" style={{ paddingBottom: 32 }}>
        <div style={{ background: result.passed ? "rgb(122 158 126 / 0.10)" : CARD, border: `1px solid ${result.passed ? SUCCESS : BORDER}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: result.passed ? SUCCESS : FG_MUTED }}>
            {result.passed ? "Passed" : "Not passed"}
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: FG, marginTop: 6 }}>
            {result.score} / {result.total} ({result.percent}%)
          </div>
          <p style={{ fontSize: 14, color: FG_MUTED, marginTop: 6, lineHeight: 1.6 }}>
            {result.passed
              ? `Your credential has been issued. Passing score was ${state.passPercent}%.`
              : `You needed ${state.passPercent}% to pass. Attempt ${result.attemptNumber} is recorded.`}
          </p>
          {!result.passed && (
            <p style={{ fontSize: 14, color: FG_MUTED, marginTop: 8 }}>
              {result.creditsRemaining > 0
                ? `You have ${result.creditsRemaining} retake credit${result.creditsRemaining === 1 ? "" : "s"} left.`
                : "Your free attempt is used. A retake credit unlocks the next attempt."}
            </p>
          )}
        </div>
        <CertificateList certificates={result.certificates} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setAnswers({});
              setResult(null);
              setPhase(state.readyToAttempt ? "intro" : "locked");
              load();
            }}
            style={{ padding: "11px 18px", borderRadius: 8, background: "transparent", border: `1.5px solid ${BORDER}`, color: FG_MUTED, cursor: "pointer", fontSize: 14, fontWeight: 700 }}
          >
            Back to test overview
          </button>
        </div>
      </div>
    );
  }

  if (phase === "test") {
    const answered = state.questions.every((_, i) => answers[i] !== undefined);
    return (
      <div className="flex flex-col gap-5" style={{ paddingBottom: 32 }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: FG_MUTED }}>{state.testTitle}</div>
          <p style={{ fontSize: 14, color: FG_MUTED, marginTop: 6, lineHeight: 1.6 }}>{state.testInstructions}</p>
        </div>

        {state.questions.map((q, qi) => (
          <div key={qi} style={{ paddingBottom: 8 }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: FG, lineHeight: 1.5, marginBottom: 10 }}>
              {qi + 1}. {q.question}
            </p>
            {q.options.map((opt, i) => {
              const picked = answers[qi] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((prev) => ({ ...prev, [qi]: i }))}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 16px",
                    marginBottom: 8,
                    borderRadius: 10,
                    background: picked ? "rgb(59 91 170 / 0.10)" : CARD,
                    border: picked ? `1.5px solid ${PRIMARY}` : `1px solid ${BORDER}`,
                    color: FG,
                    fontSize: 15,
                    fontWeight: picked ? 600 : 500,
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ))}

        {error && <p style={{ fontSize: 14, color: "var(--danger, #be5050)" }}>{error}</p>}

        <button
          onClick={submit}
          disabled={!answered || submitting}
          style={{
            padding: "13px 0",
            borderRadius: 10,
            background: answered && !submitting ? PRIMARY : CARD,
            color: answered && !submitting ? ON_PRIMARY : FG_MUTED,
            border: "none",
            cursor: answered && !submitting ? "pointer" : "default",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {submitting ? "Grading…" : "Submit answers"}
        </button>
      </div>
    );
  }

  // intro or locked
  return (
    <div className="flex flex-col gap-5" style={{ paddingBottom: 32 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: FG_MUTED }}>{state.testTitle}</div>
        <p style={{ fontSize: 14, color: FG, marginTop: 8, lineHeight: 1.6 }}>{state.testInstructions}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 16 }}>
          <Stat label="Progress" value={`${state.progressPercent}%`} />
          <Stat label="Free attempt needs" value={`${state.progressThresholdPercent}%`} />
          <Stat label="Attempts used" value={String(state.attemptsUsed)} />
          <Stat label="Retake credits" value={String(state.creditsAvailable)} />
        </div>
      </div>

      <CertificateList certificates={state.certificates} />

      {!state.featureEnabled ? (
        <p style={{ fontSize: 14, color: FG_MUTED }}>Certification is temporarily unavailable.</p>
      ) : state.readyToAttempt ? (
        <button
          onClick={startTest}
          style={{ padding: "13px 0", borderRadius: 10, background: PRIMARY, color: ON_PRIMARY, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700 }}
        >
          {state.attemptsUsed === 0 && state.freeAttemptAvailable ? "Start free attempt" : "Start attempt"}
        </button>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: FG }}>This attempt is locked</div>
          <p style={{ fontSize: 14, color: FG_MUTED, marginTop: 6, lineHeight: 1.6 }}>
            {state.attemptsUsed === 0
              ? `Complete at least ${state.progressThresholdPercent}% of the course to unlock your free attempt — or unlock it now with a retake credit.`
              : "Your free attempt is used. A retake credit unlocks the next attempt."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, color: FG_MUTED }}>Stripe (international)</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: FG, marginTop: 4 }}>
                {(state.pricing.stripeAmountCents / 100).toFixed(2)} {state.pricing.stripeCurrency.toUpperCase()}
              </div>
              <button
                onClick={buyWithStripe}
                disabled={paying}
                style={{ width: "100%", marginTop: 12, padding: "11px 0", borderRadius: 8, background: PRIMARY, color: ON_PRIMARY, border: "none", cursor: paying ? "default" : "pointer", fontSize: 14, fontWeight: 700, opacity: paying ? 0.7 : 1 }}
              >
                {paying ? "Redirecting…" : "Pay & unlock"}
              </button>
            </div>

            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, color: FG_MUTED }}>Mobile money (Uganda)</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: FG, marginTop: 4 }}>
                {state.pricing.marzpayAmountUgx.toLocaleString()} {state.pricing.marzpayCurrency}
              </div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07xx xxx xxx"
                inputMode="tel"
                style={{ width: "100%", marginTop: 12, padding: "10px 12px", background: "var(--background)", border: `1px solid ${BORDER}`, borderRadius: 8, color: FG, fontSize: 14, outline: "none" }}
              />
              <button
                onClick={buyWithMarzPay}
                disabled={paying}
                style={{ width: "100%", marginTop: 8, padding: "11px 0", borderRadius: 8, background: PRIMARY, color: ON_PRIMARY, border: "none", cursor: paying ? "default" : "pointer", fontSize: 14, fontWeight: 700, opacity: paying ? 0.7 : 1 }}
              >
                {paying ? "Requesting…" : "Pay & unlock"}
              </button>
            </div>
          </div>

          {pollNote && <p style={{ fontSize: 14, color: SUCCESS, marginTop: 12 }}>{pollNote}</p>}
          {error && <p style={{ fontSize: 14, color: "var(--danger, #be5050)", marginTop: 12 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: FG_MUTED, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: FG, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function CertificateList({ certificates }: { certificates: CertificateInfo[] }) {
  if (!certificates || certificates.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {certificates.map((cert) => (
        <div key={cert.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, background: CARD }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: cert.revoked ? "var(--danger, #be5050)" : PRIMARY }}>
                {cert.definitionName}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: FG, marginTop: 4 }}>{cert.recipientName || "—"}</div>
              <div style={{ fontSize: 14, color: FG_MUTED, marginTop: 2 }}>{cert.courseName}</div>
              <div style={{ fontSize: 13, color: FG_MUTED, marginTop: 6 }}>
                ID {cert.code}
                {cert.score != null && cert.total != null ? ` · score ${cert.score}/${cert.total}` : ""}
                {cert.issuedAt ? ` · ${new Date(cert.issuedAt).toLocaleDateString()}` : ""}
              </div>
              {cert.revoked && <div style={{ fontSize: 13, color: "var(--danger, #be5050)", marginTop: 4 }}>This credential has been revoked.</div>}
            </div>
            {!cert.revoked && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`${cert.verifyUrl}/pdf`} style={{ padding: "9px 14px", borderRadius: 8, background: PRIMARY, color: ON_PRIMARY, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                  PDF
                </a>
                <a href={`${cert.verifyUrl}/png`} style={{ padding: "9px 14px", borderRadius: 8, background: "transparent", border: `1.5px solid ${BORDER}`, color: FG_MUTED, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                  PNG
                </a>
                <a href={cert.verifyUrl} target="_blank" rel="noreferrer" style={{ padding: "9px 14px", borderRadius: 8, background: "transparent", border: `1.5px solid ${BORDER}`, color: FG_MUTED, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                  Verify
                </a>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
