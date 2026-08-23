import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// Which companies filed something *and* traded outside their own normal band.
///
/// The app counted them — "9 of 36 filings came from a company that also traded
/// unusually" — and then never said which nine. A count with no names is a
/// statistic about the feed rather than something a reader can act on, and the
/// names were sitting in the same document.
///
/// **This is a measurement, not a list of picks.** Every card states the two
/// published facts it is made of: the volume that session and the company's own
/// twenty-day median, as a multiple. It says nothing about price direction,
/// nothing about whether the move was warranted, and nothing about what to do —
/// the band is the same 2× for all 282 names and it is printed on the card.
class BUnusualRail extends ConsumerWidget {
  const BUnusualRail({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final feed = ref.watch(disclosuresProvider).value?.value;
    if (feed == null) return const SizedBox.shrink();

    // One card per company, not per filing: a company that filed three things
    // on an unusual day is one unusual company.
    final byTicker = <String, ({String ticker, double ratio, String date})>{};
    for (final item in feed.worthALook) {
      final evidence = item.evidence;
      if (evidence == null || evidence.ticker.isEmpty) continue;
      final held = byTicker[evidence.ticker];
      if (held == null || evidence.ratio > held.ratio) {
        byTicker[evidence.ticker] = (
          ticker: evidence.ticker,
          ratio: evidence.ratio,
          date: evidence.date ?? item.date,
        );
      }
    }
    if (byTicker.isEmpty) return const SizedBox.shrink();

    final rows = byTicker.values.toList()
      ..sort((a, b) => b.ratio.compareTo(a.ratio));

    final directory = ref.watch(companyDirectoryProvider).value?.value;
    final names = {
      for (final CompanySummary company
          in directory?.companies ?? const <CompanySummary>[])
        company.ticker: company,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l.unusualBody(rows.length, feed.items.length),
          style: BarbarianType.bodyM.copyWith(
            color: c.textSecondary,
            height: 1.45,
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          // Scaled, not fixed. A horizontal list has to bound its own height,
          // and 108pt was enough for the type at 1.0 and 25pt short of it at
          // the 1.4 the app clamps to — which is an overflow stripe on Home
          // rather than a smaller card.
          height: 128 * MediaQuery.textScalerOf(context).scale(1),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final row = rows[index];
              final company = names[row.ticker];
              return _Card(
                ticker: row.ticker,
                date: row.date,
                // The Arabic name where the reader is reading Arabic and the
                // directory has one — 85 companies do.
                name: company == null
                    ? ''
                    : (Directionality.of(context) == TextDirection.rtl
                          ? (company.nameAr ?? company.nameEn)
                          : company.nameEn),
                ratio: row.ratio,
                // Only where we hold the company. The exchange names issuers
                // our directory does not — see `showFilingActions`.
                onTap: company == null
                    ? null
                    : () => context.push(
                        Routes.companyPath(BNavTab.home, row.ticker),
                      ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({
    required this.ticker,
    required this.name,
    required this.ratio,
    required this.date,
    required this.onTap,
  });

  final String ticker;
  final String name;
  final double ratio;

  /// The session the multiple was measured on (§49). This feed spans a month
  /// now, so an undated measurement would read as "this morning".
  final String date;

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    return BPressable(
      onTap: onTap,
      child: Container(
        width: 156,
        padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
        decoration: BoxDecoration(
          color: c.ink,
          borderRadius: BorderRadius.circular(BarbarianRadius.lg),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              ticker,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: BarbarianType.titleL.copyWith(color: c.onInk),
            ),
            if (name.isNotEmpty)
              Flexible(
                child: Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: BarbarianType.labelNano.copyWith(color: c.onInkMuted),
                ),
              ),
            // The measurement, stated as the multiple it is. Flexible so the
            // row yields instead of forcing the card past its bound — these
            // rail heights are the thing that overflows at large text sizes.
            Flexible(
              child: Row(
                children: [
                  Expanded(
                    child: BNumText(
                      l.unusualTimes(ratio.toStringAsFixed(2)),
                      style: BarbarianType.bodyM.copyWith(color: c.accentOnInk),
                    ),
                  ),
                  if (date.isNotEmpty)
                    Text(
                      date.length >= 10 ? date.substring(5) : date,
                      style: BarbarianType.labelNano.copyWith(
                        color: c.onInkMuted,
                      ),
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
