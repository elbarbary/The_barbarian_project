import '../../l10n/app_localizations.dart';
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

/// The scale a money figure is being said in.
enum EgpScale { billions, millions, thousands }

/// A figure in EGP millions, broken into what to print and what to call it.
///
/// The filed statements arrive already denominated in millions, and the old
/// formatter divided by a thousand *again* for anything at or above 1000 and
/// tagged the result `k`. So a company that earned 1.215 billion pounds had it
/// rendered as **"1215.0k"** with a separate unit **"m"** beside it, and the
/// headline profit read "9.4k" under "مليون جنيه". 136 of the 227 companies
/// with filed statements were in that branch.
///
/// "9.35 مليار جنيه" is a quantity an Egyptian adult holds in their head.
/// "9.4k" under "مليون" is arithmetic homework in two notations.
class EgpAmount {
  const EgpAmount(this.figure, this.scale);

  /// What to print. `—` when there is no figure at all.
  final String figure;

  /// What to call it, or null when there is nothing to call.
  final EgpScale? scale;

  bool get isEmpty => scale == null;
}

/// Breaks a figure **in EGP millions** into a figure and a scale.
EgpAmount egpMillions(double? v) {
  if (v == null) return const EgpAmount('—', null);
  final abs = v.abs();
  if (abs >= 1000) return EgpAmount(_round(v / 1000), EgpScale.billions);
  if (abs >= 1) return EgpAmount(_round(v), EgpScale.millions);
  return EgpAmount(_round(v * 1000), EgpScale.thousands);
}

/// Two significant places where they carry meaning, none where they do not.
String _round(double v) => v.abs() >= 100
    ? v.toStringAsFixed(0)
    : v.abs() >= 10
    ? v.toStringAsFixed(1)
    : v.toStringAsFixed(2);

/// The word for a scale, in the reader's language.
String egpUnit(EgpScale scale, AppLocalizations l) => switch (scale) {
  EgpScale.billions => l.unitBillionsEgp,
  EgpScale.millions => l.unitMillionsEgp,
  EgpScale.thousands => l.unitThousandsEgp,
};

/// A figure in EGP millions, said in full — "9.35 مليار جنيه".
String egpText(double? v, AppLocalizations l) {
  final amount = egpMillions(v);
  final scale = amount.scale;
  if (scale == null) return amount.figure;
  return l.moneyWithUnit(amount.figure, egpUnit(scale, l));
}

/// A figure in **pounds**, said the same way — "23.0 مليون جنيه".
///
/// The exit answer and the company summary held their own compact formatter
/// each, producing "23.0m" and "1.25bn" inside Arabic prose: a Latin
/// abbreviation for a quantity of Egyptian pounds, in a sentence about
/// Egyptian pounds.
String egpFromPounds(double? v, AppLocalizations l) =>
    egpText(v == null ? null : v / 1e6, l);

/// One scale for a whole column of figures, chosen by the largest of them.
///
/// A statement table where each cell picks its own scale is unreadable: the
/// eye cannot compare 4.20 against 812 when one is billions and the other
/// millions. Real published accounts state the unit once at the top and hold
/// it, and so does this.
EgpScale egpScaleFor(Iterable<double?> values) {
  final biggest = values
      .whereType<double>()
      .map((v) => v.abs())
      .fold<double>(0, (a, b) => a > b ? a : b);
  if (biggest >= 1000) return EgpScale.billions;
  if (biggest >= 1) return EgpScale.millions;
  return EgpScale.thousands;
}

/// A figure in EGP millions printed in a scale chosen elsewhere.
String egpIn(double? v, EgpScale scale) {
  if (v == null) return '—';
  return _round(switch (scale) {
    EgpScale.billions => v / 1000,
    EgpScale.millions => v,
    EgpScale.thousands => v * 1000,
  });
}

/// A filed period — `Q1 2024`, `H1 2026`, `FY 2025` — said in the reader's
/// language.
///
/// These strings come out of the filings as short English codes. They are read
/// aloud in every profit sentence and stand at the head of every column of the
/// statement table, so leaving them alone put "مقارنة بـFY 2024" in the middle
/// of Arabic prose.
///
/// Anything that does not match a known shape is returned untouched: a period
/// this app cannot name is better shown as filed than guessed at.
String periodLabel(String raw, AppLocalizations l) {
  final parts = raw.trim().split(RegExp(r'\s+'));
  if (parts.length != 2) return raw;
  final [kind, year] = parts;
  return switch (kind.toUpperCase()) {
    'Q1' => l.periodQuarter1(year),
    'Q2' => l.periodQuarter2(year),
    'Q3' => l.periodQuarter3(year),
    'Q4' => l.periodQuarter4(year),
    'H1' => l.periodHalf1(year),
    'H2' => l.periodHalf2(year),
    'FY' => l.periodFullYear(year),
    _ => raw,
  };
}

/// The year-on-year move, or null when there is nothing to compare.
///
/// Takes the reader's language because every string it returns is read by a
/// person. It used to build them from English literals, so an Arabic reader
/// met "That is 26.5 times the 17 EGP m it reported in FY 2024" in the middle
/// of an otherwise Arabic screen.
ProfitMovement? profitMovement(
  FinancialPeriod now,
  FinancialPeriod? prior,
  AppLocalizations l,
) {
  final a = now.netIncome;
  final b = prior?.netIncome;
  if (a == null || b == null || prior == null) return null;

  String money(double v) => egpText(v, l);

  // A sign change has no meaningful percentage: dividing by a negative or a
  // zero base yields a number that looks precise and says nothing. Each of
  // these cases is described instead of computed.
  if (b <= 0 && a > 0) {
    return ProfitMovement(
      delta: l.pmToProfit,
      direction: ProfitDirection.up,
      sentence: b == 0
          ? l.pmMadeMoneyAfterBreakEven(
              periodLabel(now.period, l),
              periodLabel(prior.period, l),
            )
          : l.pmMadeMoneyAfterLoss(
              periodLabel(now.period, l),
              money(b.abs()),
              periodLabel(prior.period, l),
            ),
    );
  }
  if (b > 0 && a <= 0) {
    return ProfitMovement(
      delta: l.pmToLoss,
      direction: ProfitDirection.down,
      sentence: l.pmLostAfterProfit(
        periodLabel(now.period, l),
        money(b),
        periodLabel(prior.period, l),
      ),
    );
  }
  if (a <= 0 && b <= 0) {
    if (a == b) {
      return ProfitMovement(
        delta: l.pmUnchanged,
        direction: ProfitDirection.flat,
        sentence: l.pmLossSame(periodLabel(prior.period, l), money(a.abs())),
      );
    }
    final widened = a < b;
    return ProfitMovement(
      // A shrinking loss is an improvement, so the arrow points up even though
      // the number is still negative.
      delta: widened ? l.pmWiderLoss : l.pmSmallerLoss,
      direction: widened ? ProfitDirection.down : ProfitDirection.up,
      sentence: widened
          ? l.pmLossGrew(
              money(b.abs()),
              money(a.abs()),
              periodLabel(prior.period, l),
            )
          : l.pmLossShrank(
              money(b.abs()),
              money(a.abs()),
              periodLabel(prior.period, l),
            ),
    );
  }

  if (a == b) {
    return ProfitMovement(
      delta: l.pmUnchanged,
      direction: ProfitDirection.flat,
      sentence: l.pmProfitUnchanged(periodLabel(prior.period, l), money(a)),
    );
  }

  final direction = a > b ? ProfitDirection.up : ProfitDirection.down;
  final ratio = a / b;
  // Past a double, a multiple reads better than a percentage: "26 times" lands
  // where "+2,465%" does not.
  if (ratio >= 2) {
    final times = ratio.toStringAsFixed(ratio >= 10 ? 0 : 1);
    return ProfitMovement(
      delta: '$times×',
      direction: direction,
      sentence: l.pmTimesSentence(
        times,
        money(b),
        periodLabel(prior.period, l),
      ),
    );
  }
  final pct = ((a - b) / b * 100).abs();
  return ProfitMovement(
    delta: '${pct.toStringAsFixed(pct >= 10 ? 0 : 1)}%',
    direction: direction,
    sentence: a > b
        ? l.pmRose(periodLabel(prior.period, l), money(b))
        : l.pmFell(periodLabel(prior.period, l), money(b)),
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
