import { fetchTaxonomyTree, fetchCourse, fetchLesson, type ApiTaxonomyNode, type ApiCourse, type ApiLesson } from "./api";

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

const CATEGORY_COLORS: Record<string, string> = {
  programming: "tech",
  "data-science": "tech",
  "web-development": "tech",
  "mobile-development": "tech",
  "backend-development": "tech",
  languages: "languages",
  english: "languages",
  spanish: "languages",
  business: "business",
};

function mapApiNodeToCategory(node: ApiTaxonomyNode): CategoryItem {
  return {
    id: node.slug,
    label: node.name,
    icon: node.icon || "📚",
    color: CATEGORY_COLORS[node.slug] || "tech",
    subcategories: node.children.map((sub) => ({
      id: sub.slug,
      label: sub.name,
      courses: sub.children.map((course) => ({
        id: course.slug,
        title: course.name,
        instructor: "",
        duration: "",
        lessons: [],
        level: "",
        description: course.description || "",
      })),
    })),
  };
}

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

let cachedCategories: CategoryItem[] | null = null;

export async function loadCategories(): Promise<CategoryItem[]> {
  if (cachedCategories) return cachedCategories;
  try {
    const tree = await fetchTaxonomyTree();
    cachedCategories = tree.filter((n) => n.nodeType === "category").map(mapApiNodeToCategory);
    return cachedCategories;
  } catch (err) {
    console.error("Failed to load taxonomy from API, using fallback:", err);
    return getFallbackCategories();
  }
}

export async function loadCourseDetail(slug: string): Promise<CourseItem | null> {
  try {
    const course = await fetchCourse(slug);
    const lessons: LessonItem[] = course.lessons.map((l) => ({
      id: l.slug,
      title: l.title,
      duration: "",
      completed: false,
      videoId: "",
    }));
    return {
      id: course.slug,
      title: course.name,
      instructor: "",
      duration: `${lessons.length} lessons`,
      lessons,
      level: "",
      description: course.description || "",
    };
  } catch {
    return null;
  }
}

export async function loadLessonDetail(slug: string): Promise<ApiLesson | null> {
  try {
    return await fetchLesson(slug);
  } catch {
    return null;
  }
}

export function getCourse(courseId: string, categories: CategoryItem[]): CourseItem | undefined {
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      const c = sub.courses.find((c) => c.id === courseId);
      if (c) return c;
    }
  }
  return undefined;
}

function getFallbackCategories(): CategoryItem[] {
  return [
    {
      id: "programming",
      label: "Programming",
      icon: "💻",
      color: "tech",
      subcategories: [],
    },
    {
      id: "languages",
      label: "Languages",
      icon: "🌍",
      color: "languages",
      subcategories: [],
    },
    {
      id: "business",
      label: "Business",
      icon: "📈",
      color: "business",
      subcategories: [],
    },
  ];
}
