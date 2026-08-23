import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/disclosure.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/profit_movement.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/explainer_sheet.dart';
import '../../core/widgets/teaching.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// The companies whose shares changed hands far more than they normally do.
///
/// The rail this replaces on Home was gated on a filing: it read
/// `DisclosureFeed.worthALook`, which is `items.where(weight == 'check')`, so a
/// company could only appear if it had **both** traded unusually **and**
/// announced something. Nine companies today. Meanwhile the ratio is
/// computable for every listed name from two documents Home already holds —
/// `market.json` for the session's volume and `companies.json` for the
/// twenty-day median — and forty-three of them cleared 2× today. Thirty-four
/// of those were invisible because nothing was filed.
///
/// **The floor is the whole difference between this and a list of noise.** A
/// multiple is a ratio, and a ratio on a near-zero denominator is arithmetic
/// rather than news: today the raw ranking opens with IRAX at 141× on 567
/// shares against a median of four, and SAIB at 24× on nine thousand pounds of
/// trading. Both are true and neither is a fact about the exchange. Requiring
/// the session to also be materially large in absolute terms removes eleven
/// such rows and keeps thirty-two real ones, and the screen says so rather
/// than filtering silently.
class BBusiest extends ConsumerWidget {
  const BBusiest({this.limit = 10, this.parentTab = BNavTab.home, super.key});

  final int limit;
  final BNavTab parentTab;

  /// The band the rest of the app uses for "outside its own normal", published
  /// on every card that shows it.
  static const double threshold = 2.0;

  /// The session has to be worth this much in pounds as well as this many
  /// times the usual.
  ///
  /// Five million is the exchange's own lower quartile today — a quarter of
  /// listed companies trade less than this on an ordinary day — so it reads as
  /// "a session somebody would notice" rather than as a number picked to make
  /// the list a particular length. It is stated on screen.
  static const double valueFloor = 5000000;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    final directory = ref
        .watch(companyDirectoryProvider)
        .whenOrNull(data: (d) => d.value);
    final snapshot = ref.watch(livePricesProvider);
    if (directory == null || snapshot == null) return const SizedBox.shrink();

    // Which of them also told the exchange something, so the row can say so.
    // A chip, not a filter — the point of this block is that it does not
    // depend on a filing existing.
    final feed = ref
        .watch(disclosuresProvider)
        .whenOrNull(data: (d) => d.value);
    final announced = <String>{
      for (final item in feed?.items ?? const <Disclosure>[]) ...item.tickers,
    };

    final rows = busiest(
      directory: directory,
      snapshot: snapshot,
      limit: limit,
    );
    if (rows.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          BSectionLabel(l.homeWhichCompanies, bottomGap: 6),
          Text(
            l.busyNone,
            style: BarbarianType.bodyM.copyWith(
              color: c.textSecondary,
              height: 1.45,
            ),
          ),
        ],
      );
    }

    final cleared = countCleared(directory: directory, snapshot: snapshot);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // The heading carries the way in to the explanation.
        //
        // This block used to open with a section label, three sentences and a
        // four-line paragraph defining what a multiple is — a wall of text on
        // the landing screen, before a single number. The teaching is
        // unchanged and one tap away; it is just no longer the first thing a
        // reader has to get through every time they open the app.
        BSectionLabel(
          l.homeWhichCompanies,
          bottomGap: 6,
          trailing: BPressable(
            onTap: () => showExplainer(context, BTeachingLine.explainer(l)),
            child: BDottedUnderline(
              child: Text(
                l.learnMore,
                style: BarbarianType.labelS.copyWith(color: c.accent),
              ),
            ),
          ),
        ),
        Text(
          l.busyBody(cleared),
          style: BarbarianType.bodyM.copyWith(color: c.textSecondary),
        ),
        const SizedBox(height: 12),
        BPaperCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (final (i, row) in rows.indexed)
                _Row(
                  row: row,
                  arabic: arabic,
                  parentTab: parentTab,
                  announced: announced.contains(row.ticker),
                  last: i == rows.length - 1,
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        // The floor, said out loud. A list that quietly drops the loudest
        // multiples on the exchange owes the reader the reason.
        Text(
          l.busyFloorNote(egpText(valueFloor / 1e6, l)),
          style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.45),
        ),
      ],
    );
  }
}

/// One company's session against its own normal.
@immutable
class BusyRow {
  const BusyRow({
    required this.ticker,
    required this.name,
    required this.nameAr,
    required this.ratio,
    required this.changePercent,
    required this.value,
  });

  final String ticker;
  final String name;
  final String? nameAr;

  /// Volume this session ÷ the median of the last twenty.
  final double ratio;
  final double? changePercent;

  /// What the session was worth in pounds — the floor, and the reason a
  /// hundredfold multiple on four shares is not on the list.
  final double value;

  String nameFor(bool arabic) =>
      arabic && (nameAr?.isNotEmpty ?? false) ? nameAr! : name;
}

/// The ranking, as a pure function so a test can hold it still.
List<BusyRow> busiest({
  required CompanyDirectory directory,
  required MarketSnapshot snapshot,
  int limit = 10,
  double threshold = BBusiest.threshold,
  double valueFloor = BBusiest.valueFloor,
}) {
  final rows = <BusyRow>[];
  for (final company in directory.companies) {
    final median = company.medianVolume20d;
    final quote = snapshot.quoteFor(company.ticker);
    final volume = quote?.volume;
    if (median == null || median <= 0 || quote == null || volume == null) {
      continue;
    }
    final ratio = volume / median;
    final value = volume * quote.close;
    if (ratio < threshold || value < valueFloor) continue;
    rows.add(
      BusyRow(
        ticker: company.ticker,
        name: company.nameEn,
        nameAr: company.nameAr,
        ratio: ratio,
        changePercent: quote.resolvedChangePercent,
        value: value,
      ),
    );
  }
  rows.sort((a, b) => b.ratio.compareTo(a.ratio));
  return rows.take(limit).toList();
}

/// How many cleared the band, before the display cap — the number the sentence
/// above the list quotes.
int countCleared({
  required CompanyDirectory directory,
  required MarketSnapshot snapshot,
}) => busiest(
  directory: directory,
  snapshot: snapshot,
  limit: directory.companies.length,
).length;

class _Row extends StatelessWidget {
  const _Row({
    required this.row,
    required this.arabic,
    required this.parentTab,
    required this.announced,
    required this.last,
  });

  final BusyRow row;
  final bool arabic;
  final BNavTab parentTab;
  final bool announced;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final change = row.changePercent;

    return BPressable(
      onTap: () => context.push(Routes.companyPath(parentTab, row.ticker)),
      scale: 0.995,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 13, 16, 13),
        foregroundDecoration: last ? null : BHairline.rowBottom(context),
        child: Row(
          children: [
            // The multiple leads. It is the reason the row is here, and it is
            // the number the whole screen is organised around.
            SizedBox(
              width: 62,
              child: BNumText(
                '${row.ratio.toStringAsFixed(row.ratio >= 10 ? 0 : 1)}×',
                style: BarbarianType.figureM.copyWith(color: c.accent),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    row.ticker,
                    style: BarbarianType.titleS.copyWith(color: c.textPrimary),
                  ),
                  const SizedBox(height: 1),
                  if (arabic)
                    BArabicName(row.nameFor(true), color: c.textMuted)
                  else
                    BLatinName(row.nameFor(false), color: c.textMuted),
                  if (announced) ...[
                    const SizedBox(height: 5),
                    BKindChip(l.busyFiledToo),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 10),
            if (change != null)
              BChangeDelta(
                value: '${(change.abs() * 100).toStringAsFixed(2)}%',
                direction: BDirection.of(change),
              ),
          ],
        ),
      ),
    );
  }
}
