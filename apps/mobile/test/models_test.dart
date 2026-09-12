import 'package:flutter_test/flutter_test.dart';
import 'package:profy_mobile/core/errors.dart';
import 'package:profy_mobile/core/models.dart';

void main() {
  group('ApiError', () {
    test('parses the standard error envelope', () {
      final err = ApiError.fromBody(503, {
        'error': {'code': 'ai_unavailable', 'message': 'LLM down'},
      });
      expect(err.code, 'ai_unavailable');
      expect(err.message, 'LLM down');
      expect(err.statusCode, 503);
      expect(err.isAiUnavailable, isTrue);
    });

    test('tolerates missing envelope fields', () {
      final err = ApiError.fromBody(500, {'unexpected': true});
      expect(err.code, 'unknown');
      expect(err.statusCode, 500);
    });

    test('detects rate limiting', () {
      final err = ApiError.fromBody(429, {
        'error': {'code': 'rate_limited', 'message': 'slow down'},
      });
      expect(err.isRateLimited, isTrue);
    });
  });

  group('TokenPair', () {
    test('json round-trip', () {
      const pair = TokenPair(accessToken: 'a', refreshToken: 'r');
      final back = TokenPair.fromJson(
          {'access_token': 'a', 'refresh_token': 'r'});
      expect(back.accessToken, pair.accessToken);
      expect(back.refreshToken, pair.refreshToken);
    });
  });

  group('TaxonomyNode', () {
    test('parses nested children', () {
      final node = TaxonomyNode.fromJson({
        'id': '1',
        'node_type': 'category',
        'name': 'Technology',
        'slug': 'technology',
        'phase': 1,
        'children': [
          {
            'id': '2',
            'node_type': 'course',
            'name': 'Go',
            'slug': 'go',
            'children': [],
          },
        ],
      });
      expect(node.children, hasLength(1));
      expect(node.children.first.isCourse, isTrue);
      expect(node.children.first.name, 'Go');
    });
  });

  group('LessonDetail', () {
    test('parses all AI-scope fields + video', () {
      final lesson = LessonDetail.fromJson({
        'id': 'l1',
        'title': 'Intro',
        'slug': 'intro',
        'description': 'd',
        'explanation': 'e',
        'objectives': ['o1'],
        'examples': ['e1'],
        'exercises': ['x1'],
        'quizzes': [
          {
            'question': 'Q?',
            'options': ['a', 'b'],
            'answer_index': 1,
          },
        ],
        'level': 'beginner',
        'video': {
          'id': 'v1',
          'youtube_video_id': 'dQw4w9WgXcQ',
          'title': 'Primary',
          'channel': 'Profy',
          'is_primary': true,
        },
        'alternates': [],
      });
      expect(lesson.video?.youtubeVideoId, 'dQw4w9WgXcQ');
      expect(lesson.quizzes, hasLength(1));
      expect(lesson.quizzes.first.answerIndex, 1);
      expect(lesson.objectives, ['o1']);
    });

    test('tolerates null video and empty lists', () {
      final lesson = LessonDetail.fromJson({
        'id': 'l2',
        'title': 'T',
        'slug': 't',
      });
      expect(lesson.video, isNull);
      expect(lesson.quizzes, isEmpty);
    });
  });

  group('ConfigResponse', () {
    test('reads ads placements', () {
      final config = ConfigResponse.fromJson({
        'ads': {
          'enabled': true,
          'placements': [
            {'placement_id': 'home_banner', 'enabled': true, 'frequency': 3},
          ],
        },
        'app': {'force_update': false},
      });
      expect(config.adsEnabled, isTrue);
      expect(config.placement('home_banner')?.frequency, 3);
      expect(config.placement('lesson_banner'), isNull);
    });
  });
}
