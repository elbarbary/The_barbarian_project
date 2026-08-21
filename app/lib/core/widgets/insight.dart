import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';
import 'text.dart';

/// The one line saying what a story does to somebody holding EGX shares.
///
/// It sits **above** the headline, in the slot the category chip used to hold.
/// A chip reading "Contract or project" names the drawer a story was filed in;
/// this says why the story is on the screen at all, and that is the thing the
/// app is for. Where there is nothing specific to say the line is absent
/// entirely — a sentence printed on every row teaches a reader, within three
/// rows, to stop reading it.
///
/// Quieter than the headline on purpose. The headline is still the news; this
/// is the reason to read it.
class BInsightLine extends StatelessWidget {
  const BInsightLine(this.text, {this.maxLines = 2, super.key});

  final String text;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Its own direction, not the row's.
    //
    // These rows run right-to-left to sit under an Arabic headline, and an
    // English sentence inheriting that lays out backwards: the mark lands on
    // the right and the ellipsis eats the *start* of the line, so the first
    // thing a reader sees is the middle of a word. The insight and the
    // headline are frequently not in the same language — the headline is
    // whatever the outlet wrote, this is whatever the reader chose — so it
    // has to be asked separately.
    return Directionality(
      textDirection: isArabic(text) ? TextDirection.rtl : TextDirection.ltr,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // A mark rather than a label. "Why this matters" over every row is
          // four words of furniture repeated down the page; a dot in the accent
          // says the same thing once and costs six points of width.
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 5.5, end: 7),
            child: Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: c.accent,
                shape: BoxShape.circle,
              ),
            ),
          ),
          Expanded(
            child: Text(
              text,
              maxLines: maxLines,
              overflow: TextOverflow.ellipsis,
              style: BarbarianType.bodyS.copyWith(
                color: c.textSecondary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
