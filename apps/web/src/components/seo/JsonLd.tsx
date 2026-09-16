interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Profy Skill Academy",
    url: "https://profyskillacademy.com",
    logo: "https://profyskillacademy.com/logo.png",
    description: "Learn programming, languages, and professional skills with expert-led courses and AI-powered tutoring.",
    sameAs: [
      "https://twitter.com/profyskillacademy",
      "https://youtube.com/@profyskillacademy",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@profyskillacademy.com",
    },
  };
  return <JsonLd data={data} />;
}

export function WebsiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Profy Skill Academy",
    url: "https://profyskillacademy.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://profyskillacademy.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
  return <JsonLd data={data} />;
}

interface CourseJsonLdProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  lessons?: { name: string; url: string }[];
  provider?: string;
}

export function CourseJsonLd({ name, description, url, image, lessons, provider }: CourseJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url,
    provider: {
      "@type": "Organization",
      name: provider || "Profy Skill Academy",
    },
    educationalLevel: "Beginner to Advanced",
    inLanguage: "en",
    isAccessibleForFree: true,
  };
  if (image) data.image = image;
  if (lessons && lessons.length > 0) {
    data.hasCourseInstance = {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `${lessons.length} lessons`,
    };
  }
  return <JsonLd data={data} />;
}

interface LessonJsonLdProps {
  name: string;
  description: string;
  url: string;
  courseName: string;
  courseUrl: string;
  position?: number;
}

export function LessonJsonLd({ name, description, url, courseName, courseUrl, position }: LessonJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name,
    description,
    url,
    educationalLevel: "Beginner",
    learningResourceType: "Lesson",
    isPartOf: {
      "@type": "Course",
      name: courseName,
      url: courseUrl,
    },
    position: position || 1,
    provider: {
      "@type": "Organization",
      name: "Profy Skill Academy",
    },
  };
  return <JsonLd data={data} />;
}

interface FAQJsonLdProps {
  items: { question: string; answer: string }[];
}

export function FAQJsonLd({ items }: FAQJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return <JsonLd data={data} />;
}

interface BreadcrumbJsonLdProps {
  items: { name: string; url: string }[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return <JsonLd data={data} />;
}
