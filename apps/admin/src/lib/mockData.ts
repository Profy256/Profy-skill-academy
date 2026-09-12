export type NodeType = "category" | "subcategory" | "skill" | "course";

export interface TaxNode {
  id: string;
  label: string;
  type: NodeType;
  children?: TaxNode[];
}

export interface VideoAttachment {
  url: string;
  title: string;
  channel: string;
  reviewStatus: "pending" | "approved" | "needs-replacement";
  dateReviewed: string;
}

export interface CandidateVideo {
  url: string;
  notes: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Lesson {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  description: string;
  explanation: string;
  objectives: string[];
  examples: string[];
  exercises: string[];
  quizQuestions: QuizQuestion[];
  video: VideoAttachment | null;
  candidateVideos: CandidateVideo[];
}

export interface FlaggedLesson {
  id: string;
  lessonTitle: string;
  course: string;
  category: string;
  videoUrl: string;
  reason: "unavailable" | "deleted" | "private" | "age-restricted";
  dateFlagged: string;
  flaggedBy: string;
}

export const taxonomy: TaxNode[] = [
  {
    id: "cat-1",
    label: "Web Development",
    type: "category",
    children: [
      {
        id: "sub-1-1",
        label: "Frontend",
        type: "subcategory",
        children: [
          { id: "c-1-1-1", label: "HTML Fundamentals", type: "course" },
          { id: "c-1-1-2", label: "CSS Mastery", type: "course" },
          { id: "c-1-1-3", label: "JavaScript Essentials", type: "course" },
          { id: "c-1-1-4", label: "React Foundations", type: "course" },
        ],
      },
      {
        id: "sub-1-2",
        label: "Backend",
        type: "subcategory",
        children: [
          { id: "c-1-2-1", label: "Node.js Fundamentals", type: "course" },
          { id: "c-1-2-2", label: "REST API Design", type: "course" },
          { id: "c-1-2-3", label: "Auth & Authorization", type: "course" },
        ],
      },
      { id: "s-1-3", label: "HTTP & Web Protocols", type: "skill" },
      { id: "s-1-4", label: "Web Performance", type: "skill" },
    ],
  },
  {
    id: "cat-2",
    label: "Data Science",
    type: "category",
    children: [
      { id: "s-2-1", label: "Python for Data Science", type: "skill" },
      { id: "s-2-2", label: "Statistics Fundamentals", type: "skill" },
      {
        id: "sub-2-1",
        label: "Machine Learning",
        type: "subcategory",
        children: [
          { id: "c-2-1-1", label: "Supervised Learning", type: "course" },
          { id: "c-2-1-2", label: "Unsupervised Learning", type: "course" },
          { id: "c-2-1-3", label: "Neural Networks", type: "course" },
        ],
      },
      {
        id: "sub-2-2",
        label: "Data Engineering",
        type: "subcategory",
        children: [
          { id: "c-2-2-1", label: "SQL & Databases", type: "course" },
          { id: "c-2-2-2", label: "ETL Pipelines", type: "course" },
        ],
      },
    ],
  },
  {
    id: "cat-3",
    label: "Software Engineering",
    type: "category",
    children: [
      {
        id: "sub-3-1",
        label: "System Design",
        type: "subcategory",
        children: [
          { id: "c-3-1-1", label: "Scalability Patterns", type: "course" },
          { id: "c-3-1-2", label: "Microservices Architecture", type: "course" },
        ],
      },
      { id: "s-3-2", label: "Git & Version Control", type: "skill" },
      { id: "s-3-3", label: "Code Review Practices", type: "skill" },
      { id: "s-3-4", label: "Testing Strategies", type: "skill" },
    ],
  },
];

export const lessons: Lesson[] = [
  {
    id: "l-1",
    title: "Introduction to HTML Document Structure",
    courseId: "c-1-1-1",
    courseName: "HTML Fundamentals",
    description:
      "Learn the foundational structure of an HTML document, including DOCTYPE, html, head, and body elements.",
    explanation:
      "HTML (HyperText Markup Language) forms the skeleton of every web page. Every valid HTML document must begin with a DOCTYPE declaration, which tells the browser which version of HTML is being used. The <html> element is the root of the document, containing two main children: <head> (for metadata like title, charset, and linked stylesheets) and <body> (for visible content rendered on screen).",
    objectives: [
      "Understand the purpose of the DOCTYPE declaration",
      "Identify the role of the <head> and <body> elements",
      "Write a valid, minimal HTML document from scratch",
      "Use the <title> tag to set the browser tab title",
    ],
    examples: [
      "A minimal HTML5 boilerplate with correct nesting and indentation",
      "Adding a page title and charset meta tag inside <head>",
      'Linking an external CSS file using <link rel="stylesheet">',
    ],
    exercises: [
      "Create an HTML file that renders a heading and two paragraphs",
      "Add <meta> tags for charset (UTF-8) and mobile viewport",
      "Link an external stylesheet and confirm it applies via DevTools",
    ],
    quizQuestions: [
      {
        question: "Which declaration is required at the top of every valid HTML5 document?",
        options: ["<html lang=\"en\">", "<!DOCTYPE html>", "<meta charset=\"UTF-8\">", "<head>"],
        correctIndex: 1,
      },
      {
        question: "Where should the <title> element be placed?",
        options: ["Inside <body>", "Inside <header>", "Inside <head>", "Anywhere in the document"],
        correctIndex: 2,
      },
    ],
    video: {
      url: "https://www.youtube.com/watch?v=UB1O30fR-EE",
      title: "HTML Full Course – Build a Website Tutorial",
      channel: "freeCodeCamp.org",
      reviewStatus: "approved",
      dateReviewed: "2026-08-15",
    },
    candidateVideos: [
      {
        url: "https://www.youtube.com/watch?v=pQN-pnXPaVg",
        notes: "Good intro but pacing is too fast for absolute beginners",
      },
      {
        url: "https://www.youtube.com/watch?v=mU6anWqZJcc",
        notes: "3-hour course — too long for a single lesson unit, consider splitting",
      },
    ],
  },
  {
    id: "l-2",
    title: "CSS Box Model Deep Dive",
    courseId: "c-1-1-2",
    courseName: "CSS Mastery",
    description:
      "Understand how the CSS box model controls element sizing with margin, border, padding, and content areas.",
    explanation:
      "Every HTML element rendered by the browser is treated as a rectangular box. The CSS box model defines how that box's dimensions are calculated: content, padding, border, and margin each contribute to the total space the element occupies on the page. The default box-sizing is content-box, where width/height apply only to the content area. Using border-box makes sizing more predictable for layout work.",
    objectives: [
      "Explain the four components of the CSS box model",
      "Differentiate between content-box and border-box sizing",
      "Use browser DevTools to inspect box model dimensions live",
      "Apply box-sizing: border-box for predictable layouts",
    ],
    examples: [
      "Visualizing margin collapse between sibling block elements",
      "Applying box-sizing: border-box for predictable card layouts",
    ],
    exercises: [
      "Build a card component using explicit padding, border, and margin values",
      "Toggle between content-box and border-box; observe width differences",
    ],
    quizQuestions: [
      {
        question: "With box-sizing: border-box, which statement is true?",
        options: [
          "width includes only the content area",
          "width includes content + padding + border",
          "width includes content + margin",
          "width is auto-calculated",
        ],
        correctIndex: 1,
      },
    ],
    video: null,
    candidateVideos: [],
  },
  {
    id: "l-3",
    title: "Promises and Async/Await in JavaScript",
    courseId: "c-1-1-3",
    courseName: "JavaScript Essentials",
    description: "Master asynchronous JavaScript patterns using Promises and the async/await syntax.",
    explanation:
      "JavaScript is single-threaded, but its event loop enables non-blocking asynchronous operations like network requests and timers. Promises represent the eventual result of an async operation — they can be pending, fulfilled, or rejected. The async/await syntax provides a cleaner, synchronous-looking way to work with Promises, replacing deep callback nesting with readable linear code.",
    objectives: [
      "Describe the Promise lifecycle: pending, fulfilled, rejected",
      "Chain asynchronous operations using .then() and .catch()",
      "Rewrite Promise chains using async/await syntax",
      "Handle errors in async functions with try/catch",
    ],
    examples: [
      "Fetching user data from a REST API using fetch() and .then()",
      "Rewriting a Promise chain with async/await for readability",
    ],
    exercises: [
      "Write an async function that fetches posts from a public API",
      "Add robust error handling for network failures and non-2xx responses",
    ],
    quizQuestions: [],
    video: {
      url: "https://www.youtube.com/watch?v=DHvZLI7Db8E",
      title: "JavaScript Promises In 10 Minutes",
      channel: "Web Dev Simplified",
      reviewStatus: "pending",
      dateReviewed: "",
    },
    candidateVideos: [
      {
        url: "https://www.youtube.com/watch?v=vn3tm0quoqE",
        notes: "Fireship — very fast-paced, better for intermediate learners",
      },
    ],
  },
  {
    id: "l-4",
    title: "Supervised Learning Fundamentals",
    courseId: "c-2-1-1",
    courseName: "Supervised Learning",
    description: "Introduction to supervised machine learning: labeled data, training, and evaluation.",
    explanation:
      "Supervised learning is a type of machine learning where a model is trained on labeled input-output pairs. The model learns to map inputs to outputs by minimizing prediction error during training. Common algorithms include linear regression, decision trees, and support vector machines.",
    objectives: [
      "Define supervised learning and contrast it with unsupervised learning",
      "Explain the concepts of training, validation, and test sets",
      "Identify use cases for regression vs. classification",
    ],
    examples: [
      "Predicting house prices using linear regression",
      "Classifying email as spam or not-spam using a decision tree",
    ],
    exercises: [
      "Split a dataset into training and test sets using scikit-learn",
      "Train a linear regression model and evaluate with RMSE",
    ],
    quizQuestions: [],
    video: {
      url: "https://www.youtube.com/watch?v=1vkb7BCMQd0",
      title: "Machine Learning for Everybody – Full Course",
      channel: "freeCodeCamp.org",
      reviewStatus: "approved",
      dateReviewed: "2026-07-20",
    },
    candidateVideos: [],
  },
];

export const flaggedLessons: FlaggedLesson[] = [
  {
    id: "fl-1",
    lessonTitle: "Flexbox Layout Patterns",
    course: "CSS Mastery",
    category: "Web Development",
    videoUrl: "https://www.youtube.com/watch?v=3YW65K6LcIA",
    reason: "deleted",
    dateFlagged: "2026-09-08",
    flaggedBy: "auto-check",
  },
  {
    id: "fl-2",
    lessonTitle: "Promises & Async/Await in Practice",
    course: "JavaScript Essentials",
    category: "Web Development",
    videoUrl: "https://www.youtube.com/watch?v=PoRJizFvM7s",
    reason: "private",
    dateFlagged: "2026-09-07",
    flaggedBy: "sarah@profy.io",
  },
  {
    id: "fl-3",
    lessonTitle: "Introduction to NumPy Arrays",
    course: "Python for Data Science",
    category: "Data Science",
    videoUrl: "https://www.youtube.com/watch?v=QUT1VHiLmmI",
    reason: "unavailable",
    dateFlagged: "2026-09-06",
    flaggedBy: "auto-check",
  },
  {
    id: "fl-4",
    lessonTitle: "Understanding SQL Joins",
    course: "SQL & Databases",
    category: "Data Science",
    videoUrl: "https://www.youtube.com/watch?v=9yeOJ0ZMUYw",
    reason: "age-restricted",
    dateFlagged: "2026-09-05",
    flaggedBy: "marcus@profy.io",
  },
  {
    id: "fl-5",
    lessonTitle: "Git Branching Strategies",
    course: "Git & Version Control",
    category: "Software Engineering",
    videoUrl: "https://www.youtube.com/watch?v=FyAAIHHClqI",
    reason: "deleted",
    dateFlagged: "2026-09-03",
    flaggedBy: "auto-check",
  },
  {
    id: "fl-6",
    lessonTitle: "Microservices Communication Patterns",
    course: "Microservices Architecture",
    category: "Software Engineering",
    videoUrl: "https://www.youtube.com/watch?v=j6ow-UemzBc",
    reason: "unavailable",
    dateFlagged: "2026-09-01",
    flaggedBy: "auto-check",
  },
];
