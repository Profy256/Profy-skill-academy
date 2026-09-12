import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/theme.dart';
import '../../data/providers.dart';

/// Scrollable section body with consistent padding.
class SectionListView extends StatelessWidget {
  const SectionListView({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: children,
    );
  }
}

class TextParagraph extends StatelessWidget {
  const TextParagraph(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5),
    );
  }
}

class BulletItem extends StatelessWidget {
  const BulletItem({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: ProfyColors.secondary),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodyMedium)),
        ],
      ),
    );
  }
}

/// Client-scored quiz (PRD §7.2 field list; scoring client-side at MVP per
/// OpenAPI recordQuizAttempt). Records one attempt when all questions answered.
class QuizView extends ConsumerStatefulWidget {
  const QuizView({super.key, required this.quizzes, required this.lessonId});

  final List<Quiz> quizzes;
  final String lessonId;

  @override
  ConsumerState<QuizView> createState() => _QuizViewState();
}

class _QuizViewState extends ConsumerState<QuizView> {
  final _answers = <int, int>{};
  bool _submitted = false;

  int get _score {
    var score = 0;
    for (var i = 0; i < widget.quizzes.length; i++) {
      if (_answers[i] == widget.quizzes[i].answerIndex) score++;
    }
    return score;
  }

  bool get _allAnswered => _answers.length == widget.quizzes.length;

  Future<void> _submit() async {
    setState(() => _submitted = true);
    try {
      await ref
          .read(apiClientProvider)
          .recordQuizAttempt(widget.lessonId, _score, widget.quizzes.length);
      ref.invalidate(profileStatsProvider);
    } catch (_) {
      // Non-fatal: scoring already shown locally.
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (var i = 0; i < widget.quizzes.length; i++)
          _QuizCard(
            index: i,
            quiz: widget.quizzes[i],
            selected: _answers[i],
            submitted: _submitted,
            onSelected: (v) => setState(() => _answers[i] = v),
          ),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: _allAnswered && !_submitted ? _submit : null,
          child: Text(_submitted ? 'Score: $_score / ${widget.quizzes.length}' : 'Submit'),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _QuizCard extends StatelessWidget {
  const _QuizCard({
    required this.index,
    required this.quiz,
    required this.selected,
    required this.submitted,
    required this.onSelected,
  });

  final int index;
  final Quiz quiz;
  final int? selected;
  final bool submitted;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Q${index + 1}. ${quiz.question}',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            RadioGroup<int>(
              groupValue: selected,
              onChanged: (int? v) {
                if (!submitted && v != null) onSelected(v);
              },
              child: Column(
                children: [
                  for (var o = 0; o < quiz.options.length; o++)
                    RadioListTile<int>(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: o,
                      title: Text(quiz.options[o]),
                      activeColor: ProfyColors.primary,
                      subtitle: (submitted && o == quiz.answerIndex)
                          ? const Text('Correct answer',
                              style: TextStyle(color: ProfyColors.success))
                          : null,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
