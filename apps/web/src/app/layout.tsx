import type { Metadata } from "next";
import { JetBrains_Mono, Lora, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Profy Skill Academy — Learn Programming, Languages & Professional Skills",
    template: "%s | Profy Skill Academy",
  },
  description:
    "Master programming, languages, and professional skills with expert-led courses, AI-powered tutoring, and hands-on exercises. Free courses available.",
  keywords: [
    "learn programming",
    "online courses",
    "learn languages",
    "web development",
    "mobile development",
    "JavaScript",
    "Python",
    "React",
    "Flutter",
    "English",
    "Spanish",
    "data science",
    "free courses",
    "AI tutor",
  ],
  authors: [{ name: "Profy Skill Academy" }],
  creator: "Profy Skill Academy",
  publisher: "Profy Skill Academy",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://profyskillacademy.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Profy Skill Academy",
    title: "Profy Skill Academy — Learn Programming, Languages & Professional Skills",
    description:
      "Master programming, languages, and professional skills with expert-led courses and AI-powered tutoring.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Profy Skill Academy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Profy Skill Academy",
    description:
      "Master programming, languages, and professional skills with expert-led courses and AI-powered tutoring.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body className={`${lora.variable} ${sourceSans.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
