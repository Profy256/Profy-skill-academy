import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

/// Applies to every test in `test/` automatically.
///
/// Golden comparisons are pixel-exact by default, which makes them fail on
/// harmless rendering drift between machines (font rasterisation, Flutter
/// patch version, installed fonts). We keep them meaningful by accepting a
/// small pixel difference and still failing on real UI regressions: any diff
/// above [tolerance] throws exactly like the stock comparator does.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  final GoldenFileComparator current = goldenFileComparator;
  if (current is LocalFileComparator) {
    goldenFileComparator = TolerantGoldenFileComparator(
      current.basedir.resolve('flutter_test_config.dart'),
      tolerance: 0.02,
    );
  }
  await testMain();
}

/// [LocalFileComparator] that tolerates up to `tolerance` (0.02 = 2%) pixel
/// difference before failing the test.
class TolerantGoldenFileComparator extends LocalFileComparator {
  TolerantGoldenFileComparator(super.testFile, {this.tolerance = 0.02});

  final double tolerance;

  @override
  Future<bool> compare(Uint8List imageBytes, Uri golden) async {
    final ComparisonResult result = await GoldenFileComparator.compareLists(
      imageBytes,
      await getGoldenBytes(golden),
    );

    final bool acceptable = result.diffPercent <= tolerance;
    if (result.passed || acceptable) {
      result.dispose();
      return true;
    }

    final String error = await generateFailureOutput(result, golden, basedir);
    result.dispose();
    throw FlutterError(error);
  }
}
