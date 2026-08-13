import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/barbarian_theme.dart';
import 'composites.dart';
import 'controls.dart';

/// Renders an [AsyncValue] without ever showing a blank screen (spec §49).
///
/// Loading is a set of static dimmed blocks — the design is explicit that there
/// is no shimmer. An error is a sentence about what is missing, not a stack
/// trace and not an empty page.
class BAsyncView<T> extends StatelessWidget {
  const BAsyncView({
    required this.value,
    required this.data,
    this.loading,
    this.errorTitle = 'Could not load this',
    this.errorBody =
        'You may be offline. Anything already downloaded is still here.',
    this.onRetry,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T value) data;
  final Widget? loading;
  final String errorTitle;
  final String errorBody;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return value.when(
      skipLoadingOnRefresh: true,
      // A cached value that is being refreshed keeps rendering; only a genuine
      // cold start reaches the placeholder.
      data: data,
      loading: () => loading ?? const BLoadingBlocks(),
      error: (error, _) => BEmptyState(
        title: errorTitle,
        body: errorBody,
        actionLabel: onRetry == null ? null : 'Try again',
        onAction: onRetry,
      ),
    );
  }
}

/// The loading placeholder: static dimmed blocks at 40%, no shimmer.
class BLoadingBlocks extends StatelessWidget {
  const BLoadingBlocks({this.rows = 3, this.height = 84, super.key});

  final int rows;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < rows; i++) ...[
            if (i > 0) const SizedBox(height: BarbarianSpace.md),
            BSkeletonBlock(height: height, radius: BarbarianRadius.lg),
          ],
        ],
      ),
    );
  }
}

/// The "reading sample data" marker.
///
/// Shown wherever prices appear while the app runs on bundled fixtures, so an
/// invented number is never mistaken for a real one.
class BSampleDataNotice extends StatelessWidget {
  const BSampleDataNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BStaleDataPill('Sample data · not live prices', tone: c.accent);
  }
}
