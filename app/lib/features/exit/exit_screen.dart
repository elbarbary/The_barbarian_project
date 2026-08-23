import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/exit_liquidity.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/async_view.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/legal.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/screen_scaffold.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';

/// «أقدر أخرج؟» — Can I get out?
///
/// The question that comes before every other one, and the one nobody in Egypt
/// answers. Both competitors hold the data that would answer it — FoudaLens
/// buys order-book depth from EGID and spends it on trading signals — and
/// neither asks it, because their reader is assumed to be somebody hunting an
/// edge rather than somebody about to put a month's salary into a name they
/// may not be able to get it back out of.
///
/// Two things make this publishable by an unlicensed publisher:
///
///  * **The ladder is fixed and identical for everyone** (spec §8.7). It never
///    asks what you hold, so it never advises you about what you hold, and it
///    stores nothing because it is told nothing.
///  * **Every line is arithmetic with its assumption printed beside it.** "A
///    fifth of a day's trading" is a stated participation rate a reader is
///    free to reject, not a market law being asserted.
class ExitScreen extends ConsumerStatefulWidget {
  const ExitScreen({required this.parentTab, this.ticker, super.key});

  final BNavTab parentTab;

  /// Opened for one company, or as the standing primer with a search.
  final String? ticker;

  @override
  ConsumerState<ExitScreen> createState() => _ExitScreenState();
}

class _ExitScreenState extends ConsumerState<ExitScreen> {
  final _search = TextEditingController();

  /// This screen's own search text.
  ///
  /// It used to write an app-wide provider that the company directory also
  /// wrote and neither cleared, so a query typed here reappeared as a filter
  /// over there. Local state and a query-keyed provider is the whole fix.
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final query = _query;
    final results = ref.watch(searchResultsProvider(_query));

    return BDetailScaffold(
      blockGap: 18,
      children: [
        Row(
          children: [
            BSoftIconButton(
              icon: Icons.arrow_back_ios_new_rounded,
              semanticLabel: l.back,
              onTap: () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
        BScreenTitle(l.exitCanIGetOut, subtitle: l.exitHeadline),
        const _HowItWorks(),
        if (widget.ticker == null) ...[
          BSearchPill(
            text: 'Check a company by name or symbol…',
            controller: _search,
            onChanged: (v) => setState(() => _query = v),
          ),
          if (query.isNotEmpty)
            for (final company in results.take(12))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: BPressable(
                  onTap: () => context.push(
                    Routes.exitPath(widget.parentTab, company.ticker),
                  ),
                  child: BPaperCard(
                    padding: const EdgeInsets.all(13),
                    child: Row(
                      children: [
                        BTickerMonogram(company.ticker, size: 38),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            company.nameEn,
                            style: BarbarianType.bodyL.copyWith(
                              color: c.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Icon(
                          Icons.chevron_right_rounded,
                          size: 18,
                          color: c.textFaint,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
        ] else
          _ForCompany(ticker: widget.ticker!),
        const BLegalFootnote(),
      ],
    );
  }
}

/// The mechanism, once, before any company.
class _HowItWorks extends StatelessWidget {
  const _HowItWorks();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    return BPaperCard(
      radius: BarbarianRadius.xl,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.exitNeedsBuyer,
            style: BarbarianType.headlineM.copyWith(color: c.textPrimary),
          ),
          const SizedBox(height: 12),
          Text(
            l.exitHowItWorks,
            style: BarbarianType.bodyM.copyWith(
              color: c.textSecondary,
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}

class _ForCompany extends ConsumerWidget {
  const _ForCompany({required this.ticker});

  final String ticker;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;

    return BAsyncView(
      value: ref.watch(companyProvider(ticker)),
      errorTitle: 'No data downloaded for $ticker yet',
      errorBody: 'Open this once with a connection and it stays on the device.',
      data: (sourced) {
        final company = sourced.value;
        final exit = ExitLiquidity.of(company);

        if (exit == null) {
          return BEmptyState(
            title: l.exitNotEnough(ticker),
            body: l.exitNoHistoryBody,
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              company.name.en,
              style: BarbarianType.titleM.copyWith(color: c.textPrimary),
            ),
            const SizedBox(height: 14),
            if (exit.stops) ...[_Stops(exit: exit), const SizedBox(height: 14)],
            // The one figure that is different for every company.
            //
            // The ladder below is the same four rungs for everyone by design,
            // and that made two very different shares look identical: EGP
            // 50,000 is "about a day" on almost anything liquid. This is the
            // same arithmetic solved the other way round — a fifth of a normal
            // day's trading — and on this exchange it runs from a few thousand
            // pounds to tens of millions.
            if (exit.sameDayLimit > 0)
              BPaperCard(
                radius: BarbarianRadius.xl,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.exitOneSession,
                      style: BarbarianType.labelTiny.copyWith(
                        color: c.textMuted,
                        letterSpacing: 0.7,
                      ),
                    ),
                    const SizedBox(height: 8),
                    BNumText(
                      'EGP ${_short(exit.sameDayLimit)}',
                      style: BarbarianType.displayS.copyWith(
                        color: c.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l.exitPastThat,
                      style: BarbarianType.bodyS.copyWith(
                        color: c.textSecondary,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 18),
            BSectionLabel(l.exitIfYouPutIn),
            const SizedBox(height: 10),
            BPaperCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (var i = 0; i < ExitLiquidity.ladder.length; i++)
                    _Rung(
                      exit: exit,
                      amount: ExitLiquidity.ladder[i],
                      last: i == ExitLiquidity.ladder.length - 1,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              l.exitAssumption,
              style: BarbarianType.bodyS.copyWith(
                color: c.textMuted,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            _Facts(exit: exit),
          ],
        );
      },
    );
  }
}

/// The days it simply did not trade. The strongest fact on the screen, so it
/// sits above the ladder rather than beneath it.
class _Stops extends StatelessWidget {
  const _Stops({required this.exit});

  final ExitLiquidity exit;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 15, 16, 16),
      decoration: BoxDecoration(
        color: c.down.withValues(alpha: c.isDark ? 0.18 : 0.12),
        borderRadius: BorderRadius.circular(BarbarianRadius.lg),
        border: Border(left: BorderSide(color: c.down, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l.exitStopsTrading.toUpperCase(),
            style: BarbarianType.labelNano.copyWith(
              color: BarbarianPalette.onWash(c, c.down),
            ),
          ),
          const SizedBox(height: 7),
          Text(
            l.exitNothingChanged(exit.zeroVolumeDays, exit.sessions),
            style: BarbarianType.bodyL.copyWith(
              color: c.textPrimary,
              height: 1.45,
            ),
          ),
          if (exit.lastTraded case final String lastDay) ...[
            const SizedBox(height: 6),
            Text(
              l.exitLastTraded(lastDay),
              style: BarbarianType.bodyS.copyWith(color: c.textSecondary),
            ),
          ],
        ],
      ),
    );
  }
}

class _Rung extends StatelessWidget {
  const _Rung({required this.exit, required this.amount, required this.last});

  final ExitLiquidity exit;
  final int amount;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final days = exit.sessionsToSell(amount);
    final share = exit.shareOfDay(amount);
    // Above a fifth of a day the wait stops being "about a session" and
    // becomes a real one — that is the threshold worth marking.
    final heavy = share >= ExitLiquidity.participation;

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 15, 16, 15),
      foregroundDecoration: last ? null : BHairline.rowBottom(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'EGP ${_grouped(amount)}',
                  style: BarbarianType.figureS.copyWith(color: c.textPrimary),
                ),
              ),
              if (days.isFinite)
                Flexible(
                  child: Text(
                    exit.waitFor(amount, l),
                    textAlign: TextAlign.end,
                    style: BarbarianType.labelNano.copyWith(
                      color: heavy
                          ? BarbarianPalette.onWash(c, c.accent)
                          : c.textMuted,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            exit.plainFor(amount, l),
            style: BarbarianType.bodyM.copyWith(
              color: c.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  static String _grouped(int value) {
    final digits = value.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }
}

class _Facts extends StatelessWidget {
  const _Facts({required this.exit});

  final ExitLiquidity exit;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final rows = <(String, String)>[
      (
        'A normal day’s trading',
        exit.normalDailyValue <= 0
            ? 'not published'
            : 'EGP ${_short(exit.normalDailyValue)}',
      ),
      ('Sessions under 1,000 shares', '${exit.thinDays} of ${exit.sessions}'),
      if (exit.freeFloatPercent case final double float)
        (
          'Shares free to trade',
          '${float.toStringAsFixed(1)}% — the rest do not move',
        ),
      ('Daily price limit', '±20%, set by the exchange'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        BSectionLabel(l.exitNumbersBehind),
        const SizedBox(height: 10),
        BPaperCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < rows.length; i++)
                Container(
                  padding: const EdgeInsets.fromLTRB(18, 14, 16, 14),
                  foregroundDecoration: i == rows.length - 1
                      ? null
                      : BHairline.rowBottom(context),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          rows[i].$1,
                          style: BarbarianType.bodyM.copyWith(
                            color: c.textSecondary,
                          ),
                        ),
                      ),
                      Flexible(
                        child: Text(
                          rows[i].$2,
                          textAlign: TextAlign.end,
                          style: BarbarianType.bodyM.copyWith(
                            color: c.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Pounds, shortened. One formatter, so two cards cannot disagree about
/// what 1,250,000 looks like.
String _short(double value) {
  if (value >= 1e9) return '${(value / 1e9).toStringAsFixed(2)}bn';
  if (value >= 1e6) return '${(value / 1e6).toStringAsFixed(1)}m';
  if (value >= 1e3) return '${(value / 1e3).round()}k';
  return value.toStringAsFixed(0);
}
