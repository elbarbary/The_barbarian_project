import 'company.dart';

/// Which way a figure moved, without saying whether that is good.
enum ProfitDirection { up, down, flat }

/// What net profit did against the same period a year earlier, in words.
///
/// This is the app's whole reason for existing applied to one number. Two
/// figures side by side — 447.1 and 17.4 — are data. "Twenty-six times what it
/// made in the same half last year" is the thing a reader actually takes away,
/// and almost nobody does that arithmetic in their head.
///
/// It stays strictly descriptive. It says what the figures did; it never says
/// what to do about them, whether the shares are cheap, or what happens next.
/// The publisher is not licensed to give investment advice and this is the file
/// most likely to drift into it, so the line is drawn here rather than in the
/// widget that renders it.
class ProfitMovement {
  const ProfitMovement({
    required this.delta,
    required this.direction,
    required this.sentence,
  });

  /// A short badge: `26x`, `12%`, `to a profit`.
  final String delta;
  final ProfitDirection direction;

  /// One plain sentence a reader with no finance background can follow.
  final String sentence;
}

/// Formats EGP millions the way the tiles do.
String formatMillions(double? v) => v == null
    ? '—'
    : v.abs() >= 1000
    ? '${(v / 1000).toStringAsFixed(1)}k'
    : v.abs() >= 10
    ? v.toStringAsFixed(0)
    : v.toStringAsFixed(1);

/// The year-on-year move, or null when there is nothing to compare.
ProfitMovement? profitMovement(FinancialPeriod now, FinancialPeriod? prior) {
  final a = now.netIncome;
  final b = prior?.netIncome;
  if (a == null || b == null || prior == null) return null;

  // A sign change has no meaningful percentage: dividing by a negative or a
  // zero base yields a number that looks precise and says nothing. Each of
  // these cases is described instead of computed.
  if (b <= 0 && a > 0) {
    return ProfitMovement(
      delta: 'to a profit',
      direction: ProfitDirection.up,
      sentence: b == 0
          ? 'It made money in ${now.period}, after breaking even in '
                '${prior.period}.'
          : 'It made money in ${now.period}, after losing '
                '${formatMillions(b.abs())} EGP m in ${prior.period}.',
    );
  }
  if (b > 0 && a <= 0) {
    return ProfitMovement(
      delta: 'to a loss',
      direction: ProfitDirection.down,
      sentence: 'It lost money in ${now.period}, after making '
          '${formatMillions(b)} EGP m in ${prior.period}.',
    );
  }
  if (a <= 0 && b <= 0) {
    if (a == b) {
      return ProfitMovement(
        delta: 'unchanged',
        direction: ProfitDirection.flat,
        sentence: 'The loss was the same as in ${prior.period}, at '
            '${formatMillions(a.abs())} EGP m.',
      );
    }
    final widened = a < b;
    return ProfitMovement(
      // A shrinking loss is an improvement, so the arrow points up even though
      // the number is still negative.
      delta: widened ? 'wider loss' : 'smaller loss',
      direction: widened ? ProfitDirection.down : ProfitDirection.up,
      sentence: 'The loss ${widened ? 'grew' : 'shrank'}, from '
          '${formatMillions(b.abs())} to ${formatMillions(a.abs())} EGP m '
          'against ${prior.period}.',
    );
  }

  if (a == b) {
    return ProfitMovement(
      delta: 'unchanged',
      direction: ProfitDirection.flat,
      sentence: 'Profit was unchanged against ${prior.period}, at '
          '${formatMillions(a)} EGP m.',
    );
  }

  final direction = a > b ? ProfitDirection.up : ProfitDirection.down;
  final ratio = a / b;
  // Past a double, a multiple reads better than a percentage: "26 times" lands
  // where "+2,465%" does not.
  if (ratio >= 2) {
    final times = ratio.toStringAsFixed(ratio >= 10 ? 0 : 1);
    return ProfitMovement(
      delta: '${times}x',
      direction: direction,
      sentence: 'That is $times times the ${formatMillions(b)} EGP m it '
          'reported in ${prior.period}.',
    );
  }
  final pct = ((a - b) / b * 100).abs();
  return ProfitMovement(
    delta: '${pct.toStringAsFixed(pct >= 10 ? 0 : 1)}%',
    direction: direction,
    sentence: 'Profit ${a > b ? 'rose' : 'fell'} against ${prior.period}, when '
        'it reported ${formatMillions(b)} EGP m.',
  );
}

/// The most recent earlier period covering the same span as [now].
///
/// Periods do not all measure the same thing. A company files Q1, then the
/// half, then nine months, then the year, each cumulative from the start of its
/// financial year — so the entry sitting next to `H1 2026` in a sorted list may
/// well be `Q1 2026`, which `H1 2026` contains. Comparing them would report a
/// rise that is only the second quarter existing.
///
/// Like is compared with like: same period kind, nearest earlier one.
FinancialPeriod? comparablePrior(
  List<FinancialPeriod> periods,
  FinancialPeriod now,
) {
  final kind = now.period.split(' ').first;
  final index = periods.indexOf(now);
  if (index <= 0) return null;
  for (var i = index - 1; i >= 0; i--) {
    final candidate = periods[i];
    if (candidate.period.split(' ').first != kind) continue;
    // Also the same basis. A company files standalone and consolidated for the
    // same period and the two differ, so whichever source won each period is
    // decided independently — which can leave a consolidated figure sitting
    // above a standalone one. Comparing those measures the difference between
    // two accounting boundaries as though it were a year of trading. Where
    // neither carries a basis (the annual statements do not) there is nothing
    // to mismatch.
    final a = now.basis, b = candidate.basis;
    if (a != null && b != null && a != b) continue;
    return candidate;
  }
  return null;
}
