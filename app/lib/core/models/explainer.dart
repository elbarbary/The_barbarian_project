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

  /// How much of the company actually changes hands, against its own normal.
  ///
  /// The denominator is a **median** of the last twenty sessions, not a mean,
  /// which is why a holiday week or a suspension distorts it — said in the
  /// caveat rather than left for the reader to discover.
  static Explainer? relativeVolume(Company company) {
    final volume = company.market?.volume;
    final median = _num(company, 'median_volume_20d');
    if (volume == null || median == null || median <= 0) return null;

    final ratio = volume / median;
    final pct = ((ratio - 1) * 100).round();
    // Zero volume is not "100% less than normal" — it is a different kind of
    // fact, and the phrasing that works for a quiet day reads as a rounding
    // artefact here. Eight listings on this exchange stop entirely.
    final plain = volume == 0
        ? 'It did not trade at all.'
        : switch (pct) {
            0 => 'Traded exactly its normal amount.',
            > 0 => 'Traded $pct% more than its normal amount.',
            _ => 'Traded ${pct.abs()}% less than its normal amount.',
          };

    return Explainer(
      termId: 'rv20',
      title: 'How much it traded',
      plain: plain,
      token: '${ratio.toStringAsFixed(2)}× normal',
      workings:
          '${_n(volume)} shares traded\n'
          '÷ ${_n(median)} — the middle session of the last 20\n'
          '= ${ratio.toStringAsFixed(2)}',
      yardstick: volume == 0
          ? 'Nothing changed hands. There was no price at which a holder '
                'could sell, because selling needs somebody on the other side.'
          : 'Below 1 is quieter than usual. Above 2 is unusual and worth '
                'reading the filings for.',
      notability: ratio >= 2 ? Notability.notable : Notability.ordinary,
      source: 'EGX session data'
          '${company.market?.date == null ? '' : ', ${company.market!.date}'}',
      caveat:
          'The comparison is against the middle session of the last twenty, '
          'not the average. A holiday week or a trading halt moves it.',
    );
  }

  /// Where in the day's range it finished — the tape's own tell, and one that
  /// means nothing to anybody who has not been taught to read it.
  static Explainer? closeStrength(Company company) {
    final m = company.market;
    if (m == null) return null;
    final high = m.high;
    final low = m.low;
    final close = m.lastClose;
    if (high == null || low == null || close == null) return null;
    if (high <= low) return null;

    final fraction = (close - low) / (high - low);
    final pct = (fraction * 100).round();
    final plain = fraction >= 0.5
        ? 'Finished in the upper half of the day it traded in.'
        : 'Finished in the lower half of the day it traded in.';

    return Explainer(
      termId: 'close_strength',
      title: 'Where it finished',
      plain: plain,
      token: '$pct% of the day’s range',
      workings:
          'Closed at ${close.toStringAsFixed(2)}\n'
          '− the day’s low ${low.toStringAsFixed(2)}\n'
          '÷ (high ${high.toStringAsFixed(2)} − low ${low.toStringAsFixed(2)})\n'
          '= $pct%',
      yardstick:
          '100% means it closed at the very top of its range, 0% at the very '
          'bottom. One session on its own says little.',
      // A single session's close position is not a threshold event, and
      // dressing it as one would be reading tea leaves.
      notability: Notability.unjudged,
      source: 'EGX session data'
          '${m.date == null ? '' : ', ${m.date}'}',
    );
  }

  /// The exit question, answered from public arithmetic — the one thing the
  /// spec says nobody else in Egypt has built.
  static Explainer? freeFloat(Company company) {
    final float = _num(company, 'free_float');
    final shares = _num(company, 'shares_outstanding');
    if (float == null || float <= 0) return null;

    final pct = float * 100;
    final inHundred = (pct / 1).round().clamp(0, 100);
    final floatShares = _num(company, 'float_shares') ??
        (shares == null ? null : shares * float);

    return Explainer(
      termId: 'free_float',
      title: 'How much of it can actually be bought',
      plain:
          'Only $inHundred shares in every 100 actually trade.',
      token: '${pct.toStringAsFixed(1)}% free float',
      workings: floatShares == null
          ? '${pct.toStringAsFixed(2)}% of the shares are free to trade.'
          : '${_n(floatShares)} shares are free to trade\n'
              '${shares == null ? '' : '÷ ${_n(shares)} shares in issue\n'}'
              '= ${pct.toStringAsFixed(2)}%',
      yardstick:
          'The rest sit with owners who do not sell. A small float means the '
          'price moves further on the same order — in both directions — and '
          'that selling in size can take days.',
      // The threshold where a float starts to govern whether you can get out.
      notability: pct < 15 ? Notability.notable : Notability.ordinary,
      source: 'Ownership table, most recent filing',
      caveat:
          'A market value calculated on all the shares is not what the '
          'company would fetch when only a fraction of them trade.',
    );
  }

  /// What the whole company is priced at — stated as a price, never as worth.
  static Explainer? marketCap(Company company) {
    final cap = _num(company, 'market_cap');
    final shares = _num(company, 'shares_outstanding');
    final close = company.market?.lastClose;
    if (cap == null || cap <= 0) return null;

    final billions = cap / 1e9;
    final plain = billions >= 1
        ? 'The whole company is priced at ${billions.toStringAsFixed(2)} '
              'billion pounds.'
        : 'The whole company is priced at ${(cap / 1e6).round()} million '
              'pounds.';

    return Explainer(
      termId: 'market_cap',
      title: 'What the whole company is priced at',
      plain: plain,
      token: 'EGP ${_n(cap)}',
      workings: shares == null || close == null
          ? 'EGP ${_n(cap)}'
          : '${_n(shares)} shares in issue\n'
              '× EGP ${close.toStringAsFixed(2)} a share\n'
              '= EGP ${_n(cap)}',
      yardstick:
          'This is what the market is charging for the company today, not a '
          'measure of what it owns or earns.',
      notability: Notability.unjudged,
      source: 'Shares in issue from the latest filing, price from the close',
      caveat:
          'It multiplies every share by the last traded price, including the '
          'shares that never trade.',
    );
  }

  /// A move over a window, with the window named. "+18.5%" alone hides that
  /// the reader is looking at a month.
  static Explainer? move({
    required String title,
    required String window,
    required double? percent,
    String? asOf,
  }) {
    if (percent == null) return null;
    final rounded = percent.abs().toStringAsFixed(1);
    final plain = percent >= 0
        ? 'Worth $rounded% more than it was $window ago.'
        : 'Worth $rounded% less than it was $window ago.';

    return Explainer(
      termId: 'price_move',
      title: title,
      plain: plain,
      token: '${percent >= 0 ? '+' : '−'}$rounded%',
      workings:
          'The closing price now, against the closing price $window ago, as a '
          'percentage of the older one.',
      yardstick:
          'A move on its own says what happened, not why. The reason — if one '
          'was published — is in the filings and the study.',
      // A price move is not evidence of anything by itself, and a badge
      // calling a big one "unusual" would be exactly the tea-leaf reading
      // this app exists to replace.
      notability: Notability.unjudged,
      source: asOf == null ? 'EGX closing prices' : 'EGX closing prices, $asOf',
    );
  }
}
