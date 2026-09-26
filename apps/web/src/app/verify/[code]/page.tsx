import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import JsonLd from "@/components/seo/JsonLd";
import { fetchCertificate, SITE_URL } from "@/lib/blog";

export const revalidate = 60;

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const cert = await fetchCertificate(code);
  if (!cert) return { title: "Credential not found", robots: { index: false } };

  const title = `${cert.definitionName} — ${cert.recipientName}`;
  const description = `${cert.recipientName} earned “${cert.definitionName}” for ${cert.courseName} from ${cert.organization}. Credential ${cert.code}${cert.revoked ? " (revoked)" : " is valid"}.`;

  return {
    title,
    description,
    alternates: { canonical: `/verify/${cert.code}` },
    openGraph: {
      type: "profile",
      url: `/verify/${cert.code}`,
      title,
      description,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function VerifyPage({ params }: Props) {
  const { code } = await params;
  const cert = await fetchCertificate(code);
  if (!cert) {
    return (
      <SiteShell eyebrow="Verification" title="Credential not found">
        <p style={{ fontSize: 16, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
          No credential matches the code <code style={{ fontFamily: "var(--font-mono)" }}>{code.toUpperCase()}</code>.
          Check the code printed on the certificate and try again.
        </p>
        <Link href="/" style={{ color: "var(--primary)", fontWeight: 600 }}>
          ← Back to Dera Skul
        </Link>
      </SiteShell>
    );
  }

  const url = `${SITE_URL}/verify/${cert.code}`;
  const status = cert.revoked ? "Revoked" : "Valid";

  return (
    <SiteShell eyebrow="Credential verification" title={cert.definitionName}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "EducationalOccupationalCredential",
          name: cert.definitionName,
          credentialCategory: "certificate",
          url,
          description: `${cert.recipientName} — ${cert.courseName}, issued by ${cert.organization}.`,
          identifier: cert.code,
          dateIssued: cert.issuedAt || undefined,
          awardedBy: { "@type": "Organization", name: cert.organization, url: SITE_URL },
          about: { "@type": "Course", name: cert.courseName },
          status: cert.revoked ? "Revoked" : "Active",
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: cert.recipientName,
          worksFor: { "@type": "Organization", name: cert.organization },
        }}
      />

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 18,
          overflow: "hidden",
          background: "var(--card)",
          maxWidth: 720,
        }}
      >
        <div
          style={{
            padding: "26px 28px",
            borderBottom: "1px solid var(--border)",
            background: cert.revoked ? "rgba(190,80,80,0.08)" : "rgba(122,158,126,0.10)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: cert.revoked ? "#be5050" : "var(--success)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: cert.revoked ? "#be5050" : "var(--success)",
                display: "inline-block",
              }}
            />
            {status}
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 30, margin: "10px 0 0", lineHeight: 1.2 }}>
            {cert.recipientName}
          </h2>
          <p style={{ fontSize: 16, color: "var(--muted-foreground)", marginTop: 6 }}>
            {cert.courseName} · {cert.organization}
          </p>
        </div>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 0,
            margin: 0,
          }}
        >
          <Field label="Credential ID" value={cert.code} mono />
          <Field label="Issued" value={cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
          {cert.score != null && cert.total != null && (
            <Field label="Final test score" value={`${cert.score} / ${cert.total} (pass ${cert.passPercent}%)`} />
          )}
          {cert.holderEmailHint && <Field label="Holder" value={cert.holderEmailHint} />}
          {cert.revoked && cert.revokedAt && (
            <Field label="Revoked" value={new Date(cert.revokedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
          )}
        </dl>

        <div style={{ padding: "20px 28px 26px", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={`${url}/pdf`} style={actionButton(true)}>
            Download PDF
          </a>
          <a href={`${url}/png`} style={actionButton(false)}>
            Download PNG
          </a>
          {cert.courseSlug && (
            <Link href="/" style={actionButton(false)}>
              View course
            </Link>
          )}
        </div>
      </div>

      <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginTop: 20, maxWidth: 640, lineHeight: 1.7 }}>
        This page is the authoritative check for credential <strong>{cert.code}</strong>. Anyone with the link or the code can
        confirm that {cert.recipientName} earned {cert.definitionName} from {cert.organization}.
      </p>
    </SiteShell>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: "18px 24px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <dt style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted-foreground)" }}>
        {label}
      </dt>
      <dd style={{ margin: "6px 0 0", fontSize: 16, fontFamily: mono ? "var(--font-mono)" : undefined, color: "var(--foreground)" }}>
        {value}
      </dd>
    </div>
  );
}

function actionButton(primary: boolean) {
  return {
    padding: "11px 18px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    background: primary ? "var(--primary)" : "transparent",
    color: primary ? "var(--on-primary)" : "var(--muted-foreground)",
    border: primary ? "none" : "1.5px solid var(--border)",
  } as const;
}
