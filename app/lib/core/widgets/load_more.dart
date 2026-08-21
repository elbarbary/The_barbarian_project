import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import 'motion.dart';

/// "There is more, and here is how much."
///
/// It was a bare `TextButton` in the middle of a column, which on a long feed
/// reads as a caption rather than a control — a reader scrolling to the end of
/// thirty rows sees the page stop and assumes that is all there is. A feed
/// that has 400 stories behind five needs the way through to be the most
/// obvious thing at the bottom of it.
///
/// Full width, its own edge, and it says what tapping does and what is left.
class BLoadMoreButton extends StatelessWidget {
  const BLoadMoreButton({
    required this.label,
    required this.onTap,
    this.note = '',
    this.busy = false,
    super.key,
  });

  final String label;

  /// What is behind it — "showing 30 of 400", "August · 36 filings". A count
  /// is the difference between a button somebody might press and one they
  /// will.
  final String note;

  final VoidCallback? onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: busy ? null : onTap,
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(minHeight: 52),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        decoration: BoxDecoration(
          color: c.surfaceRaised,
          borderRadius: BorderRadius.circular(BarbarianRadius.pill),
          border: Border.all(color: c.hairlineStrong),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (busy)
              SizedBox(
                width: 15,
                height: 15,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: c.textMuted,
                ),
              )
            else
              Icon(Icons.expand_more, size: 19, color: c.accent),
            const SizedBox(width: 9),
            Flexible(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: BarbarianType.bodyM.copyWith(
                      color: c.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (note.isNotEmpty) ...[
                    const SizedBox(height: 1),
                    Text(
                      note,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: BarbarianType.labelNano.copyWith(
                        color: c.textFaint,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
