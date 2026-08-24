import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../core/models/company.dart';
import '../../core/models/disclosure.dart';
import '../../core/models/news.dart';
import '../../core/models/market_snapshot.dart';
import '../../core/models/recency.dart';
import '../../core/models/signals.dart';
import '../../core/providers.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import '../../core/widgets/nav.dart';
import '../../core/widgets/surfaces.dart';
import '../../core/widgets/text.dart';
import '../../l10n/app_localizations.dart';

/// Why this share is busy today — and a section that fades as it stops being.
///
/// The market screens already say *which* companies traded unusually; opening
/// one of them asked the obvious next question and got no answer. This answers
/// it the only way the app is allowed to: by putting the session's own
/// arithmetic next to everything else that landed on this company in the same
/// few days, and letting the reader join them.
///
/// **It never says one caused the other.** "Volume rose because of the
/// dividend" is a claim nobody here can support — plenty of shares trade heavy
/// on nothing at all, and saying otherwise about a named security is exactly
/// what §8 forbids. What it says is: this is how much it traded against its
/// own median, and these are the documents from the same week. The joining is
/// the reader's.
///
/// **The section is loudest when the fact is.** A share at four times its
/// usual volume gets a card at the top of the page; one drifting back through
/// twice gets the same card, quieter; below [_Tier.calm] it disappears
/// entirely rather than sitting there reporting that nothing is happening.
/// That decay is the feature — a permanent "volume" panel would train a reader
/// to ignore the one day it matters.
class BVolumeExplainer extends ConsumerWidget {
  const BVolumeExplainer({
    required this.company,
    required this.quote,
    required this.parentTab,
    super.key,
  });

  final Company company;
  final StockQuote? quote;
  final BNavTab parentTab;

  /// How many days either side of the session count as "the same few days".
  ///
  /// Four, matching `build_connections_api.py` — a filing lodged after the
  /// close moves the next session, and a Thursday filing moves Sunday.
  static const int windowDays = 4;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = context.colors;

    // The 20-session median lives on the directory summary rather than the
    // company document — it is a property of the scan, not of the filing.
    final median = ref
        .watch(companyDirectoryProvider)
        .whenOrNull(data: (s) => s.value.byTicker(company.ticker))
        ?.medianVolume20d;

    final tier = _tierFor(median, quote);
    if (tier == _Tier.normal) return const SizedBox.shrink();

    final ratio = _ratio(median, quote)!;
    final since = DateTime.now().subtract(const Duration(days: windowDays));
    final causes = _nearby(ref, company.ticker, since);

    final headline = l.volBusy(_ratioText(ratio));
    final loud = tier == _Tier.loud;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: BPaperCard(
        // Quieter at the calm tier: an outline rather than a filled card, so
        // the difference is a shape and not only a shade (§42).
        padding: loud
            ? const EdgeInsets.fromLTRB(16, 15, 16, 15)
            : const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.only(top: 1, end: 10),
                  child: Icon(
                    Icons.multiline_chart_rounded,
                    size: loud ? 20 : 16,
                    color: loud ? c.accent : c.textMuted,
                  ),
                ),
                Expanded(
                  child: Text(
                    headline,
                    style: (loud ? BarbarianType.titleS : BarbarianType.bodyM)
                        .copyWith(color: c.textPrimary, height: 1.4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              // Said before anything is listed, so the list below is never
              // read as a cause.
              causes.isEmpty ? l.volNothingFiled : l.volAlsoThisWeek,
              style: BarbarianType.bodyS.copyWith(
                color: c.textMuted,
                height: 1.45,
              ),
            ),
            for (final cause in causes) ...[
              const SizedBox(height: 10),
              _CauseRow(cause: cause, parentTab: parentTab),
            ],
            const SizedBox(height: 10),
            Text(
              l.volFootnote,
              style: BarbarianType.labelNano.copyWith(
                color: c.textFaint,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _ratioText(double ratio) =>
      '${ratio.toStringAsFixed(ratio >= 10 ? 0 : 1)}×';

  /// Today's volume against this company's own 20-session median.
  ///
  /// The same measure the market screens rank on, so a reader who arrived from
  /// the busiest list sees the number that put it there rather than a second
  /// one computed differently.
  static double? _ratio(double? median, StockQuote? quote) {
    final volume = quote?.volume;
    if (median == null || median <= 0 || volume == null) return null;
    return volume / median;
  }

  static _Tier _tierFor(double? median, StockQuote? quote) {
    final ratio = _ratio(median, quote);
    if (ratio == null) return _Tier.normal;
    if (ratio >= _Tier.loudAt) return _Tier.loud;
    if (ratio >= _Tier.calmAt) return _Tier.calm;
    return _Tier.normal;
  }

  /// Everything else that landed on this company inside the window.
  ///
  /// Filings, headlines that name it, and a break in its own reported record.
  /// All three are things the app already holds; none of them is fetched for
  /// this screen.
  static List<_Cause> _nearby(WidgetRef ref, String ticker, DateTime since) {
    final out = <_Cause>[];

    final documents = ref
        .watch(companyDocumentsProvider(ticker))
        .value
        ?.value
        .items;
    for (final filing in documents ?? const <FiledDocument>[]) {
      if (DateTime.tryParse(filing.date) case final DateTime at
          when at.isAfter(since)) {
        out.add(_Cause(
          kind: _CauseKind.filing,
          date: filing.date,
          title: filing.title,
          titleEn: filing.titleEn ?? '',
          link: filing.link,
        ));
      }
      if (out.length >= 3) break;
    }

    final news = ref.watch(newsProvider).value?.value.items;
    for (final NewsItem item in news ?? const <NewsItem>[]) {
      if (!item.tickers.contains(ticker)) continue;
      if (DateTime.tryParse(item.published) case final DateTime at
          when at.isAfter(since)) {
        out.add(_Cause(
          kind: _CauseKind.news,
          date: item.published,
          title: item.headline,
          titleEn: item.headlineEn ?? '',
          // A story keeps one link per outlet that carried it; the first is
          // the one that broke it.
          link: item.sources.isEmpty ? '' : item.sources.first.link,
        ));
      }
      if (out.length >= 5) break;
    }

    // A streak break is not dated to this week, but "it reported its first
    // loss in 27 periods" is the most likely reason a quiet share is suddenly
    // not, and the reader would otherwise have to scroll past this card to
    // find it.
    final signals = ref.watch(companySignalsProvider(ticker)).value?.value;
    for (final streak in signals?.streaks ?? const <StreakBreak>[]) {
      if (DateTime.tryParse(streak.filed) case final DateTime at
          when at.isAfter(since)) {
        out.add(_Cause(
          kind: _CauseKind.result,
          date: streak.filed,
          title: '',
          titleEn: '',
          link: streak.link,
          streak: streak,
        ));
      }
    }
    return out.take(5).toList();
  }
}

enum _Tier {
  loud,
  calm,
  normal;

  /// Twice its own median is the threshold the market screens already use, so
  /// a company loud here is a company that appeared on the busiest list.
  static const double loudAt = 2.0;

  /// Below twice but still clearly above its own normal. The card stays, with
  /// the volume turned down.
  static const double calmAt = 1.3;
}

enum _CauseKind { filing, news, result }

class _Cause {
  const _Cause({
    required this.kind,
    required this.date,
    required this.title,
    required this.titleEn,
    required this.link,
    this.streak,
  });

  final _CauseKind kind;
  final String date;
  final String title;
  final String titleEn;
  final String link;
  final StreakBreak? streak;

  String titleFor(bool arabic) {
    if (arabic && title.isNotEmpty) return title;
    return titleEn.isEmpty ? title : titleEn;
  }
}

class _CauseRow extends StatelessWidget {
  const _CauseRow({required this.cause, required this.parentTab});

  final _Cause cause;
  final BNavTab parentTab;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final arabic = Directionality.of(context) == TextDirection.rtl;

    final (icon, label) = switch (cause.kind) {
      _CauseKind.filing => (Icons.description_outlined, l.volKindFiling),
      _CauseKind.news => (Icons.article_outlined, l.volKindNews),
      _CauseKind.result => (Icons.trending_down_rounded, l.volKindResult),
    };

    final text = switch (cause.streak) {
      final StreakBreak streak => streak.isFirstLoss
          ? l.sigFirstLoss(streak.period, streak.run)
          : l.sigBackToProfit(streak.period, streak.run),
      _ => cause.titleFor(arabic),
    };

    final row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.only(top: 2, end: 8),
          child: Icon(icon, size: 14, color: c.textFaint),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                text.replaceAll(RegExp(r'\s*\([A-Z0-9]+\.CA\)\s*'), ' ').trim(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textDirection: isArabic(text)
                    ? TextDirection.rtl
                    : TextDirection.ltr,
                style: BarbarianType.bodyS.copyWith(
                  color: c.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$label · ${context.dayMonthIso(cause.date)}',
                style: BarbarianType.labelNano.copyWith(color: c.textFaint),
              ),
            ],
          ),
        ),
      ],
    );

    if (cause.link.isEmpty) return row;
    return BPressable(
      onTap: () => context.push(
        Routes.articlePath(parentTab, cause.link, l.filingReaderHeader),
      ),
      child: row,
    );
  }
}
