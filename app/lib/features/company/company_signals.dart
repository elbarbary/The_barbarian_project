import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/signals.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// What is unusual about this company **against its own record**.
///
/// The app already argues this way about trading: a session is worth a look
/// because this share traded twice its own median volume, not because a number
/// is large. This is the same argument applied to the filing record, which is
/// the bigger pile — a decade of filings and every profit and loss the company
/// has reported.
///
/// Three kinds of row, and all three are counted rather than judged:
///
///   * a run of profitable or loss-making periods **ending** — a loss is a
///     fact, a first loss after twenty-seven profitable periods is news, and
///     nobody who has not read the whole archive can know it;
///   * a kind of filing appearing for the first time in years;
///   * a company that files weekly having filed nothing for six weeks.
///
/// **None of it says whether any of it is good.** A first loss is not a sell
/// signal and a return to profit is not a buy one; this publisher is not
/// licensed to imply either (§8). Every row links to the filing behind it, so
/// a reader can go and read the thing itself rather than take this on trust.
class BCompanySignals extends ConsumerWidget {
  const BCompanySignals({
    required this.ticker,
    required this.parentTab,
    super.key,
  });

  final String ticker;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final signals = ref.watch(companySignalsProvider(ticker)).value?.value;
    if (signals == null) return const SizedBox.shrink();

    final rows = <Widget>[
      for (final streak in signals.streaks)
        _Row(
          icon: streak.isFirstLoss
              ? Icons.trending_down_rounded
              : Icons.trending_up_rounded,
          headline: streak.isFirstLoss
              ? l.sigFirstLoss(streak.period, streak.run)
              : l.sigBackToProfit(streak.period, streak.run),
          detail: streak.sinceYear.isEmpty
              ? ''
              : l.sigStreakSince(streak.sinceYear),
          link: streak.link,
          parentTab: parentTab,
        ),
      for (final first in signals.firsts)
        _Row(
          icon: Icons.new_releases_outlined,
          headline: l.sigFirstOfType(first.label, first.gapYears),
          detail: first.previousYear.isEmpty
              ? ''
              : l.sigLastSeen(first.previousYear),
          link: first.link,
          parentTab: parentTab,
        ),
      if (signals.quiet case final QuietSpell quiet)
        _Row(
          icon: Icons.notifications_off_outlined,
          headline: l.sigQuiet(quiet.silentDays, quiet.typicalGap),
          detail: l.sigQuietSince(quiet.lastFiled),
          link: '',
          parentTab: parentTab,
        ),
    ];
    if (rows.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.sigLabel, bottomGap: 8),
        BPaperCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < rows.length; i++) ...[
                if (i > 0) ...[
                  const SizedBox(height: 12),
                  Divider(height: 1, color: c.hairline),
                  const SizedBox(height: 12),
                ],
                rows[i],
              ],
            ],
          ),
        ),
        const SizedBox(height: 8),
        // Said on the screen, not only in the code: these are counts off the
        // record, and the app is not telling anybody what to do about them.
        Text(
          l.sigFootnote,
          style: BarbarianType.bodyS.copyWith(color: c.textFaint, height: 1.5),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.headline,
    required this.detail,
    required this.link,
    required this.parentTab,
  });

  final IconData icon;
  final String headline;
  final String detail;
  final String link;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.only(top: 2, end: 10),
          child: Icon(icon, size: 17, color: c.accent),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                headline,
                style: BarbarianType.bodyM.copyWith(
                  color: c.textPrimary,
                  height: 1.45,
                ),
              ),
              if (detail.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  detail,
                  style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                ),
              ],
            ],
          ),
        ),
        if (link.isNotEmpty)
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 8, top: 2),
            child: Icon(Icons.north_east, size: 14, color: c.textFaint),
          ),
      ],
    );

    if (link.isEmpty) return row;
    return BPressable(
      onTap: () =>
          context.push(Routes.articlePath(parentTab, link, 'EGX filing')),
      child: row,
    );
  }
}
