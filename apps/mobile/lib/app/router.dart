import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/interests_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/welcome_screen.dart';
import '../features/home/home_screen.dart';
import '../features/home/search_screen.dart';
import '../features/learn/category_screen.dart';
import '../features/learn/learn_screen.dart';
import '../features/lesson/ai_chat_screen.dart';
import '../features/lesson/course_detail_screen.dart';
import '../features/lesson/lesson_screen.dart';
import '../features/library/library_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/profile/subscription_screen.dart';
import '../features/shell/root_shell.dart';
import '../data/providers.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(isLoggedInProvider);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/welcome',
    redirect: (context, state) {
      final loggedIn = auth.value ?? false;
      final loggingIn = state.matchedLocation.startsWith('/welcome') ||
          state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/register') ||
          state.matchedLocation.startsWith('/interests');

      // Wait for the first session emission before redirecting anywhere.
      if (!auth.hasValue && !loggingIn) return '/welcome';

      if (!loggedIn && !loggingIn) return '/welcome';
      if (loggedIn && loggingIn) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/interests',
        builder: (context, state) => const InterestsScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RootShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const HomeScreen(),
              routes: [
                GoRoute(
                  path: 'search',
                  builder: (context, state) {
                    final q = state.uri.queryParameters['q'] ?? '';
                    return SearchScreen(initialQuery: q);
                  },
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/learn',
              builder: (context, state) => const LearnScreen(),
              routes: [
                GoRoute(
                  path: 'category/:slug',
                  builder: (context, state) =>
                      CategoryScreen(slug: state.pathParameters['slug']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/library',
              builder: (context, state) => const LibraryScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfileScreen(),
              routes: [
                GoRoute(
                  path: 'subscription',
                  builder: (context, state) => const SubscriptionScreen(),
                ),
              ],
            ),
          ]),
        ],
      ),
      // Full-screen routes (own back stack, no bottom nav).
      GoRoute(
        path: '/course/:slug',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) =>
            CourseDetailScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/lesson/:slug',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => LessonScreen(slug: state.pathParameters['slug']!),
        routes: [
          GoRoute(
            path: 'ai',
            parentNavigatorKey: rootNavigatorKey,
            builder: (context, state) {
              final lessonId = state.uri.queryParameters['lessonId'] ?? '';
              final lessonTitle = state.uri.queryParameters['title'] ?? 'AI Teacher';
              return AiChatScreen(lessonId: lessonId, lessonTitle: lessonTitle);
            },
          ),
        ],
      ),
    ],
  );
});
