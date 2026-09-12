export interface LessonItem {
  id: string;
  title: string;
  duration: string;
  completed?: boolean;
  videoId: string;
}

export interface CourseItem {
  id: string;
  title: string;
  instructor: string;
  duration: string;
  lessons: LessonItem[];
  level: string;
  description: string;
}

export interface SubcategoryItem {
  id: string;
  label: string;
  courses: CourseItem[];
}

export interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  color: string; // semantic token: 'tech' | 'business' | 'languages'
  subcategories: SubcategoryItem[];
}

const YT = "dQw4w9WgXcQ"; // placeholder curated video id

export const CATEGORIES: CategoryItem[] = [
  {
    id: "tech",
    label: "Technology",
    icon: "💻",
    color: "tech",
    subcategories: [
      {
        id: "programming",
        label: "Programming",
        courses: [
          {
            id: "go-gin",
            title: "REST APIs with Go & Gin",
            instructor: "Marcus Okafor",
            duration: "4h 20m",
            level: "Intermediate",
            description:
              "Build production-ready REST APIs using Go and the Gin web framework. Covers routing, middleware, authentication, and deployment.",
            lessons: [
              { id: "l1", title: "Introduction to Go modules", duration: "12m", completed: true, videoId: YT },
              { id: "l2", title: "Setting up your Gin project", duration: "18m", completed: true, videoId: YT },
              { id: "l3", title: "Defining routes and handlers", duration: "22m", completed: false, videoId: YT },
              { id: "l4", title: "Middleware and authentication", duration: "28m", completed: false, videoId: YT },
              { id: "l5", title: "Connecting to PostgreSQL", duration: "25m", completed: false, videoId: YT },
              { id: "l6", title: "Deploying to production", duration: "20m", completed: false, videoId: YT },
            ],
          },
          {
            id: "python-basics",
            title: "Python for Absolute Beginners",
            instructor: "Amara Singh",
            duration: "6h 10m",
            level: "Beginner",
            description:
              "Start from zero and build real Python programs. No prior experience needed.",
            lessons: [
              { id: "p1", title: "Your first Python program", duration: "15m", completed: false, videoId: YT },
              { id: "p2", title: "Variables and data types", duration: "20m", completed: false, videoId: YT },
              { id: "p3", title: "Control flow: if, for, while", duration: "25m", completed: false, videoId: YT },
            ],
          },
        ],
      },
      {
        id: "design",
        label: "UX & Design",
        courses: [
          {
            id: "figma-ui",
            title: "UI Design in Figma",
            instructor: "Yuki Tanaka",
            duration: "5h 45m",
            level: "Beginner",
            description: "Master Figma from scratch. Build professional UI mockups and design systems.",
            lessons: [
              { id: "f1", title: "Figma workspace overview", duration: "10m", completed: false, videoId: YT },
              { id: "f2", title: "Frames, components, and auto-layout", duration: "22m", completed: false, videoId: YT },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "business",
    label: "Business & Finance",
    icon: "📈",
    color: "business",
    subcategories: [
      {
        id: "entrepreneurship",
        label: "Entrepreneurship",
        courses: [
          {
            id: "lean-startup",
            title: "Lean Startup Fundamentals",
            instructor: "Fatima Al-Hassan",
            duration: "3h 30m",
            level: "Beginner",
            description:
              "Validate your business idea before investing time and money. Build, measure, learn.",
            lessons: [
              { id: "ls1", title: "The problem-solution fit", duration: "18m", completed: false, videoId: YT },
              { id: "ls2", title: "Building an MVP", duration: "24m", completed: false, videoId: YT },
              { id: "ls3", title: "Customer interviews that work", duration: "20m", completed: false, videoId: YT },
            ],
          },
        ],
      },
      {
        id: "investing",
        label: "Personal Finance",
        courses: [
          {
            id: "investing-101",
            title: "Investing for Beginners",
            instructor: "Jerome Baptiste",
            duration: "4h 00m",
            level: "Beginner",
            description:
              "Understand stocks, bonds, index funds, and how to start investing with any income.",
            lessons: [
              { id: "i1", title: "Why investing matters", duration: "14m", completed: false, videoId: YT },
              { id: "i2", title: "Index funds explained", duration: "22m", completed: false, videoId: YT },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "languages",
    label: "Languages",
    icon: "🌍",
    color: "languages",
    subcategories: [
      {
        id: "english",
        label: "English",
        courses: [
          {
            id: "eng-beginner",
            title: "English for Beginners",
            instructor: "Claire Morel",
            duration: "8h 00m",
            level: "Beginner",
            description:
              "Start speaking English with confidence from day one. Focus on real conversations.",
            lessons: [
              { id: "eb1", title: "Greetings and introductions", duration: "20m", completed: true, videoId: YT },
              { id: "eb2", title: "Numbers, dates, and time", duration: "18m", completed: true, videoId: YT },
              { id: "eb3", title: "Shopping and everyday situations", duration: "22m", completed: false, videoId: YT },
            ],
          },
          {
            id: "eng-intermediate",
            title: "English: Intermediate Conversations",
            instructor: "Claire Morel",
            duration: "6h 30m",
            level: "Intermediate",
            description:
              "Upgrade your English for professional settings, complex ideas, and nuanced expression.",
            lessons: [
              { id: "ei1", title: "Making arguments and opinions", duration: "25m", completed: false, videoId: YT },
              { id: "ei2", title: "Professional email writing", duration: "22m", completed: false, videoId: YT },
            ],
          },
          {
            id: "eng-advanced",
            title: "Advanced English & Idioms",
            instructor: "Claire Morel",
            duration: "5h 00m",
            level: "Advanced",
            description: "Master idioms, formal writing, and speak like a native in any context.",
            lessons: [
              { id: "ea1", title: "Common idioms in context", duration: "20m", completed: false, videoId: YT },
              { id: "ea2", title: "Academic and formal writing", duration: "28m", completed: false, videoId: YT },
            ],
          },
        ],
      },
      {
        id: "spanish",
        label: "Spanish",
        courses: [
          {
            id: "spanish-beginner",
            title: "Spanish from Zero",
            instructor: "Diego Reyes",
            duration: "7h 00m",
            level: "Beginner",
            description:
              "Learn conversational Spanish with clear, structured lessons you can follow anywhere.",
            lessons: [
              { id: "sp1", title: "Basic greetings and phrases", duration: "16m", completed: false, videoId: YT },
              { id: "sp2", title: "Verbs: ser vs estar", duration: "24m", completed: false, videoId: YT },
            ],
          },
        ],
      },
    ],
  },
];

export const FEATURED_COURSES = [
  {
    id: "go-gin",
    cat: "tech",
    sub: "programming",
    title: "REST APIs with Go & Gin",
    instructor: "Marcus Okafor",
    level: "Intermediate",
    tag: "Technology",
    img: "photo-1461749280684-dccba630e2f6",
  },
  {
    id: "lean-startup",
    cat: "business",
    sub: "entrepreneurship",
    title: "Lean Startup Fundamentals",
    instructor: "Fatima Al-Hassan",
    level: "Beginner",
    tag: "Business",
    img: "photo-1552664730-d307ca884978",
  },
  {
    id: "eng-beginner",
    cat: "languages",
    sub: "english",
    title: "English for Beginners",
    instructor: "Claire Morel",
    level: "Beginner",
    tag: "Languages",
    img: "photo-1503676260728-1c00da094a0b",
  },
];

export const INTEREST_OPTIONS = [
  { id: "programming", label: "Programming", icon: "💻" },
  { id: "design", label: "UX & Design", icon: "🎨" },
  { id: "business", label: "Business", icon: "📊" },
  { id: "languages", label: "Languages", icon: "🌍" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "marketing", label: "Marketing", icon: "📢" },
  { id: "data", label: "Data Science", icon: "🔬" },
  { id: "writing", label: "Writing", icon: "✍️" },
  { id: "photography", label: "Photography", icon: "📷" },
];

export const SAVED_LESSONS = [
  { id: "l3", title: "Defining routes and handlers", course: "REST APIs with Go & Gin", duration: "22m" },
  { id: "i2", title: "Index funds explained", course: "Investing for Beginners", duration: "22m" },
  { id: "eb3", title: "Shopping and everyday situations", course: "English for Beginners", duration: "22m" },
];

export const getCourse = (courseId: string): CourseItem | undefined => {
  for (const cat of CATEGORIES) {
    for (const sub of cat.subcategories) {
      const c = sub.courses.find((c) => c.id === courseId);
      if (c) return c;
    }
  }
};
