/// Hand-written models mirroring `backend/api/openapi.yaml` (TECHNICAL_DOC §3:
/// the Flutter client is hand-written against the same spec).
library;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

class TokenPair {
  const TokenPair({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;

  factory TokenPair.fromJson(Map<String, dynamic> j) => TokenPair(
        accessToken: j['accessToken'] as String? ?? j['access_token'] as String,
        refreshToken: j['refreshToken'] as String? ?? j['refresh_token'] as String,
      );

  Map<String, dynamic> toJson() => {
        'access_token': accessToken,
        'refresh_token': refreshToken,
      };
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

class TaxonomyNode {
  const TaxonomyNode({
    required this.id,
    required this.nodeType,
    required this.name,
    required this.slug,
    required this.phase,
    required this.isActive,
    required this.sortOrder,
    required this.depth,
    required this.children,
    this.parentId,
    this.description,
    this.icon,
  });

  final String id;
  final String? parentId;
  final String nodeType; // category | subcategory | course
  final String name;
  final String slug;
  final String? description;
  final String? icon;
  final int phase;
  final bool isActive;
  final int sortOrder;
  final int depth;
  final List<TaxonomyNode> children;

  bool get isCourse => nodeType == 'course';

  factory TaxonomyNode.fromJson(Map<String, dynamic> j) => TaxonomyNode(
        id: j['id'] as String,
        parentId: (j['parentId'] ?? j['parent_id']) as String?,
        nodeType: (j['nodeType'] ?? j['node_type']) as String,
        name: j['name'] as String,
        slug: j['slug'] as String,
        description: j['description'] as String?,
        icon: j['icon'] as String?,
        phase: ((j['phase'] as num?)?.toInt()) ?? 1,
        isActive: (j['isActive'] as bool?) ?? (j['is_active'] as bool?) ?? true,
        sortOrder: ((j['sortOrder'] as num?) ?? (j['sort_order'] as num?))?.toInt() ?? 0,
        depth: (j['depth'] as num?)?.toInt() ?? 0,
        children: ((j['children'] as List?) ?? const [])
            .map((e) => TaxonomyNode.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class Breadcrumb {
  const Breadcrumb({required this.name, required this.slug});

  final String name;
  final String slug;

  factory Breadcrumb.fromJson(Map<String, dynamic> j) =>
      Breadcrumb(name: j['name'] as String, slug: j['slug'] as String);
}

class NodeDetail {
  const NodeDetail({required this.node, required this.breadcrumb});

  final TaxonomyNode node;
  final List<Breadcrumb> breadcrumb;

  factory NodeDetail.fromJson(Map<String, dynamic> j) => NodeDetail(
        node: TaxonomyNode.fromJson(j),
        breadcrumb: ((j['breadcrumb'] as List?) ?? const [])
            .map((e) => Breadcrumb.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

// ---------------------------------------------------------------------------
// Courses & lessons
// ---------------------------------------------------------------------------

class CourseSummary {
  const CourseSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.lessonCount,
    required this.levels,
    this.description,
    this.icon,
  });

  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? icon;
  final int lessonCount;
  final List<String> levels;

  factory CourseSummary.fromJson(Map<String, dynamic> j) => CourseSummary(
        id: j['id'] as String,
        name: j['name'] as String,
        slug: j['slug'] as String,
        description: j['description'] as String?,
        icon: j['icon'] as String?,
        lessonCount: (j['lesson_count'] as num?)?.toInt() ?? 0,
        levels: ((j['levels'] as List?) ?? const []).map((e) => e as String).toList(),
      );
}

class LessonSummary {
  const LessonSummary({
    required this.id,
    required this.title,
    required this.slug,
    required this.sortOrder,
    this.level,
  });

  final String id;
  final String title;
  final String slug;
  final String? level; // beginner | intermediate | advanced
  final int sortOrder;

  factory LessonSummary.fromJson(Map<String, dynamic> j) => LessonSummary(
        id: j['id'] as String,
        title: j['title'] as String,
        slug: j['slug'] as String,
        level: j['level'] as String?,
        sortOrder: (j['sort_order'] as num?)?.toInt() ?? 0,
      );
}

class CourseDetail {
  const CourseDetail({required this.course, required this.lessons});

  final CourseSummary course;
  final List<LessonSummary> lessons;

  /// Lessons grouped by level, preserving the taxonomy's level semantics.
  Map<String?, List<LessonSummary>> get byLevel {
    final map = <String?, List<LessonSummary>>{};
    for (final l in lessons) {
      map.putIfAbsent(l.level, () => []).add(l);
    }
    return map;
  }

  factory CourseDetail.fromJson(Map<String, dynamic> j) => CourseDetail(
        course: CourseSummary.fromJson(j),
        lessons: ((j['lessons'] as List?) ?? const [])
            .map((e) => LessonSummary.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class LessonVideo {
  const LessonVideo({
    required this.id,
    required this.youtubeVideoId,
    required this.title,
    required this.isPrimary,
    this.channel,
  });

  final String id;
  final String youtubeVideoId;
  final String title;
  final String? channel;
  final bool isPrimary;

  factory LessonVideo.fromJson(Map<String, dynamic> j) => LessonVideo(
        id: j['id'] as String,
        youtubeVideoId: j['youtube_video_id'] as String,
        title: j['title'] as String,
        channel: j['channel'] as String?,
        isPrimary: (j['is_primary'] as bool?) ?? false,
      );
}

class Quiz {
  const Quiz({required this.question, required this.options, required this.answerIndex});

  final String question;
  final List<String> options;
  final int answerIndex;

  factory Quiz.fromJson(Map<String, dynamic> j) => Quiz(
        question: j['question'] as String,
        options: ((j['options'] as List?) ?? const []).map((e) => e as String).toList(),
        answerIndex: (j['answer_index'] as num).toInt(),
      );
}

class LessonDetail {
  const LessonDetail({
    required this.id,
    required this.title,
    required this.slug,
    required this.objectives,
    required this.examples,
    required this.exercises,
    required this.quizzes,
    required this.alternates,
    this.description,
    this.explanation,
    this.level,
    this.video,
  });

  final String id;
  final String title;
  final String slug;
  final String? description;
  final String? explanation;
  final List<String> objectives;
  final List<String> examples;
  final List<String> exercises;
  final List<Quiz> quizzes;
  final String? level;
  final LessonVideo? video;
  final List<LessonVideo> alternates;

  factory LessonDetail.fromJson(Map<String, dynamic> j) => LessonDetail(
        id: j['id'] as String,
        title: j['title'] as String,
        slug: j['slug'] as String,
        description: j['description'] as String?,
        explanation: j['explanation'] as String?,
        level: j['level'] as String?,
        objectives: ((j['objectives'] as List?) ?? const []).map((e) => e as String).toList(),
        examples: ((j['examples'] as List?) ?? const []).map((e) => e as String).toList(),
        exercises: ((j['exercises'] as List?) ?? const []).map((e) => e as String).toList(),
        quizzes: ((j['quizzes'] as List?) ?? const [])
            .map((e) => Quiz.fromJson(e as Map<String, dynamic>))
            .toList(),
        video: j['video'] == null ? null : LessonVideo.fromJson(j['video'] as Map<String, dynamic>),
        alternates: ((j['alternates'] as List?) ?? const [])
            .map((e) => LessonVideo.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

class SearchResult {
  const SearchResult({
    required this.type,
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.courseSlug,
    this.lessonCount,
  });

  final String type; // course | lesson
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? courseSlug;
  final int? lessonCount;

  bool get isCourse => type == 'course';

  factory SearchResult.fromJson(Map<String, dynamic> j) => SearchResult(
        type: j['type'] as String,
        id: j['id'] as String,
        name: j['name'] as String,
        slug: j['slug'] as String,
        description: j['description'] as String?,
        courseSlug: j['course_slug'] as String?,
        lessonCount: (j['lesson_count'] as num?)?.toInt(),
      );
}

class SearchResults {
  const SearchResults({required this.query, required this.results, this.nextCursor});

  final String query;
  final List<SearchResult> results;
  final String? nextCursor;

  factory SearchResults.fromJson(Map<String, dynamic> j) => SearchResults(
        query: j['query'] as String,
        results: ((j['results'] as List?) ?? const [])
            .map((e) => SearchResult.fromJson(e as Map<String, dynamic>))
            .toList(),
        nextCursor: j['next_cursor'] as String?,
      );
}

class FeaturedHome {
  const FeaturedHome({required this.featured, required this.categories});

  final List<CourseSummary> featured;
  final List<TaxonomyNode> categories;

  factory FeaturedHome.fromJson(Map<String, dynamic> j) => FeaturedHome(
        featured: ((j['featuredCourses'] as List?) ?? (j['featured'] as List?) ?? const [])
            .map((e) => CourseSummary.fromJson(e as Map<String, dynamic>))
            .toList(),
        categories: ((j['categoryGrid'] as List?) ?? (j['categories'] as List?) ?? const [])
            .map((e) => TaxonomyNode.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class AdPlacement {
  const AdPlacement({
    required this.placementId,
    required this.enabled,
    required this.frequency,
  });

  final String placementId; // home_banner | lesson_banner | lesson_interstitial | library_banner
  final bool enabled;
  final int frequency;

  factory AdPlacement.fromJson(Map<String, dynamic> j) => AdPlacement(
        placementId: j['placement_id'] as String,
        enabled: (j['enabled'] as bool?) ?? false,
        frequency: (j['frequency'] as num?)?.toInt() ?? 1,
      );
}

class ConfigResponse {
  const ConfigResponse({
    required this.adsEnabled,
    required this.adsPlacements,
    required this.forceUpdate,
    this.minVersion,
  });

  final bool adsEnabled;
  final List<AdPlacement> adsPlacements;
  final String? minVersion;
  final bool forceUpdate;

  AdPlacement? placement(String id) =>
      adsPlacements.where((p) => p.placementId == id).firstOrNull;

  factory ConfigResponse.fromJson(Map<String, dynamic> j) {
    final ads = (j['ads'] as Map?) ?? const {};
    final app = (j['app'] as Map?) ?? const {};
    return ConfigResponse(
      adsEnabled: (ads['enabled'] as bool?) ?? false,
      adsPlacements: ((ads['placements'] as List?) ?? const [])
          .map((e) => AdPlacement.fromJson(e as Map<String, dynamic>))
          .toList(),
      minVersion: app['min_version'] as String?,
      forceUpdate: (app['force_update'] as bool?) ?? false,
    );
  }
}

// ---------------------------------------------------------------------------
// AI Teacher
// ---------------------------------------------------------------------------

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String role; // user | assistant
  final String content;
  final DateTime createdAt;

  bool get isUser => role == 'user';

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'] as String,
        role: j['role'] as String,
        content: j['content'] as String,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
      );
}

// ---------------------------------------------------------------------------
// Progress & library
// ---------------------------------------------------------------------------

class ContinueLearningItem {
  const ContinueLearningItem({
    required this.lesson,
    required this.courseSlug,
    required this.courseName,
    required this.status,
    required this.updatedAt,
  });

  final LessonSummary lesson;
  final String courseSlug;
  final String courseName;
  final String status; // in_progress | completed
  final DateTime updatedAt;

  factory ContinueLearningItem.fromJson(Map<String, dynamic> j) => ContinueLearningItem(
        lesson: LessonSummary.fromJson(j['lesson'] as Map<String, dynamic>),
        courseSlug: j['course_slug'] as String,
        courseName: j['course_name'] as String,
        status: j['status'] as String,
        updatedAt: DateTime.tryParse(j['updated_at'] as String? ?? '') ?? DateTime.now(),
      );
}

class Bookmark {
  const Bookmark({
    required this.lessonId,
    required this.lessonTitle,
    required this.courseSlug,
    required this.courseName,
    required this.createdAt,
  });

  final String lessonId;
  final String lessonTitle;
  final String courseSlug;
  final String courseName;
  final DateTime createdAt;

  factory Bookmark.fromJson(Map<String, dynamic> j) => Bookmark(
        lessonId: j['lesson_id'] as String,
        lessonTitle: j['lesson_title'] as String,
        courseSlug: j['course_slug'] as String,
        courseName: j['course_name'] as String,
        createdAt: DateTime.tryParse(j['created_at'] as String? ?? '') ?? DateTime.now(),
      );
}

class ProfileStats {
  const ProfileStats({
    required this.coursesCompleted,
    required this.lessonsCompleted,
    required this.lessonsInProgress,
    required this.bookmarksCount,
    required this.quizzesTaken,
    this.avgQuizScore,
  });

  final int coursesCompleted;
  final int lessonsCompleted;
  final int lessonsInProgress;
  final int bookmarksCount;
  final int quizzesTaken;
  final double? avgQuizScore;

  factory ProfileStats.fromJson(Map<String, dynamic> j) => ProfileStats(
        coursesCompleted: (j['courses_completed'] as num?)?.toInt() ?? 0,
        lessonsCompleted: (j['lessons_completed'] as num?)?.toInt() ?? 0,
        lessonsInProgress: (j['lessons_in_progress'] as num?)?.toInt() ?? 0,
        bookmarksCount: (j['bookmarks_count'] as num?)?.toInt() ?? 0,
        quizzesTaken: (j['quizzes_taken'] as num?)?.toInt() ?? 0,
        avgQuizScore: (j['avg_quiz_score'] as num?)?.toDouble(),
      );
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

class Entitlement {
  const Entitlement({required this.isPremium, this.plan, this.currentPeriodEnd});

  final bool isPremium;
  final String? plan; // monthly | yearly
  final DateTime? currentPeriodEnd;

  factory Entitlement.fromJson(Map<String, dynamic> j) => Entitlement(
        isPremium: (j['is_premium'] as bool?) ?? false,
        plan: j['plan'] as String?,
        currentPeriodEnd: DateTime.tryParse(j['current_period_end'] as String? ?? ''),
      );
}
