import '../../l10n/app_localizations.dart';
import 'company.dart';

/// Whether a figure is sitting where it usually sits.
///
/// This is the app answering "is this important?" — and the only answer it is
/// allowed to give. Not "this is a good sign", not "watch this": *this number
/// is outside the band it normally occupies, and here is the band.* The
/// threshold is published, fixed, and identical for every company, so the
/// judgement is arithmetic rather than opinion.
enum Notability {
  /// Inside the normal band. Most figures, most days.
  ordinary('Ordinary'),

  /// Outside it, by a stated threshold.
  notable('Unusual'),

  /// The figure exists but has no published band to judge it against. Said
  /// out loud rather than defaulted to "ordinary", which would be a claim.
  unjudged('No published threshold');

  const Notability(this.label);

  final String label;
}

/// Where a figure came from, so a reader can weigh it (spec §50).
///
/// The spec asks for Fact, Calculation and Interpretation to be visually
/// distinguished "where the underlying data supports this distinction", and it
/// is the cheapest honesty in the app: an exchange-published close and this
/// app's own arithmetic over it look identical in the same typeface, and a
/// reader has no way to tell which they are being asked to trust.
///
/// The three are ordered by how far they sit from the source. Nothing in this
/// app should ever be marked `interpretation` without a licence question being
/// asked first — it is here because §50 names it, and because a marker that
/// cannot express the risky case is not a marker.
enum Provenance {
  /// Published by somebody else — the exchange, the company, an outlet. We
  /// copied it.
  fact('Fact'),

  /// Our arithmetic over published figures. Reproducible, and the workings are
  /// on the same card.
  calculation('Calculation'),

  /// Our reading of what those figures mean. The only one that is an opinion.
  interpretation('Interpretation');

  const Provenance(this.label);

  final String label;
}

/// One number, explained.
///
/// Spec §4.18 and §6. The rule the whole app hangs on is that a technical
/// figure never appears alone: the plain sentence is primary, the exact token
/// sits under it in small grey mono, and pressing either opens the arithmetic
/// with *this company's* real inputs substituted. Not an abstract formula —
/// the actual numbers, so the reader can check the claim.
///
/// The token is never hidden behind a toggle. Hiding it talks down to the
/// reader, and somebody who sees `RV20 0.28×` under the sentence for a fortnight
/// eventually learns to read a tape. That is the part that teaches without
/// running a school.
class Explainer {
  const Explainer({
    required this.termId,
    required this.title,
    required this.plain,
    required this.token,
    required this.workings,
    required this.yardstick,
    required this.notability,
    required this.source,
    this.caveat,
    this.provenance = Provenance.calculation,
  });

  /// Glossary key. One term, one explanation, everywhere in the app.
  final String termId;

  /// What the row is called — "Traded volume", not "RV20".
  final String title;

  /// One sentence of meaning. At most twelve words and at most one number
  /// (spec §6.1), because it has to be repeatable out loud.
  final String plain;

  /// The exact figure, formatted. Always visible under the sentence.
  final String token;

  /// The arithmetic, with this company's real inputs substituted.
  final String workings;

  /// Where the number sits on its own scale, and what counts as unusual.
  final String yardstick;

  final Notability notability;

  /// Fact, calculation or interpretation (spec §50). Defaults to calculation
  /// because that is what almost every row here is — a ratio this app worked
  /// out — and because defaulting to `fact` would quietly dress our own
  /// arithmetic as somebody else's published figure.
  final Provenance provenance;

  /// What produced it and when. A figure with no date is a rumour.
  final String source;

  /// A way the figure misleads, when it has one. A median denominator is
  /// distorted by a holiday week; a market cap on a thin float is not what
  /// the company would fetch. Stated where the reader is looking at it.
  final String? caveat;
}

/// Builds explainers from published fields only.
///
/// Every one of these is arithmetic over numbers already in the company
/// document — nothing is estimated, and nothing is asked of a server. Where an
/// operand is missing the builder returns null and the row is simply absent,
/// because a plain sentence over a figure whose inputs we cannot show is the
/// thing this whole mechanism exists to prevent.
abstract final class Explainers {
  /// The profile map is deliberately loose — the fields a provider publishes
  /// differ, and a missing one must simply not render (spec §49). So every
  /// read goes through here and a builder returns null rather than guessing.
  static double? _num(Company company, String key) {
    final raw = company.profile?[key];
    return raw is num ? raw.toDouble() : null;
  }

  static String _n(num v) {
    final whole = v.round().toString();
    final buf = StringBuffer();
    for (var i = 0; i < whole.length; i++) {
      if (i > 0 && (whole.length - i) % 3 == 0) buf.write(',');
      buf.write(whole[i]);
    }
    return buf.toString();
  }

  /// The session's own date, appended to the source when there is one.
  static String _session(AppLocalizations l, String? date) =>
      date == null ? l.expSourceSession : l.expSourceSessionOn(date);

  /// How much of the company actually changes hands, against its own normal.
  ///
  /// The denominator is a **median** of the last twenty sessions, not a mean,
  /// which is why a holiday week or a suspension distorts it — said in the
  /// caveat rather than left for the reader to discover.
  static Explainer? relativeVolume(Company company, AppLocalizations l) {
    final volume = company.market?.volume;
    final median = _num(company, 'median_volume_20d');
    if (volume == null || median == null || median <= 0) return null;

    final ratio = volume / median;
    final pct = ((ratio - 1) * 100).round();
    // Zero volume is not "100% less than normal" — it is a different kind of
    // fact, and the phrasing that works for a quiet day reads as a rounding
    // artefact here. Eight listings on this exchange stop entirely.
    final plain = volume == 0
        ? l.expRvNoTrade
        : switch (pct) {
            0 => l.expRvExact,
            > 0 => l.expRvMore(pct),
            _ => l.expRvLess(pct.abs()),
          };

    return Explainer(
      termId: 'rv20',
      title: l.expRvTitle,
      plain: plain,
      token: l.expRvToken(ratio.toStringAsFixed(2)),
      workings: l.expRvWorkings(
        _n(volume),
        _n(median),
        ratio.toStringAsFixed(2),
      ),
      yardstick: volume == 0 ? l.expRvYardstickNoTrade : l.expRvYardstick,
      notability: ratio >= 2 ? Notability.notable : Notability.ordinary,
      source: _session(l, company.market?.date),
      caveat: l.expRvCaveat,
    );
  }

  /// Where in the day's range it finished — the tape's own tell, and one that
  /// means nothing to anybody who has not been taught to read it.
  static Explainer? closeStrength(Company company, AppLocalizations l) {
    final m = company.market;
    if (m == null) return null;
    final high = m.high;
    final low = m.low;
    final close = m.lastClose;
    if (high == null || low == null || close == null) return null;
    if (high <= low) return null;

    final fraction = (close - low) / (high - low);
    final pct = (fraction * 100).round();

    return Explainer(
      termId: 'close_strength',
      title: l.expCloseTitle,
      plain: fraction >= 0.5 ? l.expCloseUpper : l.expCloseLower,
      token: l.expCloseToken(pct),
      workings: l.expCloseWorkings(
        close.toStringAsFixed(2),
        low.toStringAsFixed(2),
        high.toStringAsFixed(2),
        pct,
      ),
      yardstick: l.expCloseYardstick,
      // A single session's close position is not a threshold event, and
      // dressing it as one would be reading tea leaves.
      notability: Notability.unjudged,
      source: _session(l, m.date),
    );
  }

  /// The exit question, answered from public arithmetic — the one thing the
  /// spec says nobody else in Egypt has built.
  static Explainer? freeFloat(Company company, AppLocalizations l) {
    final float = _num(company, 'free_float');
    final shares = _num(company, 'shares_outstanding');
    if (float == null || float <= 0) return null;

    final pct = float * 100;
    final inHundred = (pct / 1).round().clamp(0, 100);
    final floatShares =
        _num(company, 'float_shares') ??
        (shares == null ? null : shares * float);

    return Explainer(
      termId: 'free_float',
      title: l.expFloatTitle,
      plain: l.expFloatPlain(inHundred),
      token: l.expFloatToken(pct.toStringAsFixed(1)),
      workings: floatShares == null
          ? l.expFloatWorkingsShort(pct.toStringAsFixed(2))
          : [
              l.expFloatWorkingsHead(_n(floatShares)),
              if (shares != null) l.expFloatWorkingsDiv(_n(shares)),
              l.expFloatWorkingsSum(pct.toStringAsFixed(2)),
            ].join('\n'),
      yardstick: l.expFloatYardstick,
      // The threshold where a float starts to govern whether you can get out.
      notability: pct < 15 ? Notability.notable : Notability.ordinary,
      source: l.expFloatSource,
      caveat: l.expFloatCaveat,
    );
  }

  /// What the whole company is priced at — stated as a price, never as worth.
  static Explainer? marketCap(Company company, AppLocalizations l) {
    final cap = _num(company, 'market_cap');
    final shares = _num(company, 'shares_outstanding');
    final close = company.market?.lastClose;
    if (cap == null || cap <= 0) return null;

    final billions = cap / 1e9;

    return Explainer(
      termId: 'market_cap',
      title: l.expCapTitle,
      plain: billions >= 1
          ? l.expCapPlainBillions(billions.toStringAsFixed(2))
          : l.expCapPlainMillions('${(cap / 1e6).round()}'),
      token: l.moneyWithUnit(_n(cap), l.unitEgp),
      workings: shares == null || close == null
          ? l.moneyWithUnit(_n(cap), l.unitEgp)
          : l.expCapWorkings(_n(shares), close.toStringAsFixed(2), _n(cap)),
      yardstick: l.expCapYardstick,
      notability: Notability.unjudged,
      source: l.expCapSource,
      caveat: l.expCapCaveat,
    );
  }

  /// A move over a window, with the window named. "+18.5%" alone hides that
  /// the reader is looking at a month.
  static Explainer? move({
    required String title,
    required String window,
    required double? percent,
    required AppLocalizations l,
    String? asOf,
  }) {
    if (percent == null) return null;
    final rounded = percent.abs().toStringAsFixed(1);
    // "Priced", not "worth".
    //
    // This file states the rule two builders below: market cap is given "as a
    // price, never as worth". A price is what the last trade happened at; what
    // a share is worth is a valuation, and publishing one is the thing §8
    // forbids to somebody with no licence. The two words are a syllable apart
    // and only one of them is a fact.
    return Explainer(
      termId: 'price_move',
      title: title,
      plain: percent >= 0
          ? l.expMoveHigher(rounded, window)
          : l.expMoveLower(rounded, window),
      token: '${percent >= 0 ? '+' : '−'}$rounded%',
      workings: l.expMoveWorkings(window),
      yardstick: l.expMoveYardstick,
      // A price move is not evidence of anything by itself, and a badge
      // calling a big one "unusual" would be exactly the tea-leaf reading
      // this app exists to replace.
      notability: Notability.unjudged,
      source: asOf == null ? l.expSourceCloses : l.expSourceClosesOn(asOf),
    );
  }
}
