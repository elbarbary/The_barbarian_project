import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/price_freshness.dart';
import '../providers.dart';
import '../theme/barbarian_theme.dart';
import 'text.dart';

/// States how old the prices on this screen are (spec §49).
///
/// Every place the app shows a price shows one of these. The wording comes from
/// [PriceFreshness] rather than the call site, so "15-min delayed" cannot go out
/// of step with the feed on one screen and not another.
///
/// Rebuilds itself on a timer: the elapsed part of the caption is a claim about
/// *now*, and a widget that only rebuilds when new data arrives would keep
/// saying "updated just now" for the whole five minutes between polls.
class BPriceCaption extends ConsumerStatefulWidget {
  const BPriceCaption({
    this.ticker,
    this.onDark = false,
    this.short = false,
    super.key,
  });

  /// Narrows the claim to one company, so a name the feed does not carry is not
  /// described as live. Leave null on a screen listing many companies.
  final String? ticker;

  final bool onDark;

  /// Drops the collection time and keeps the delay, for tight rows.
  final bool short;

  @override
  ConsumerState<BPriceCaption> createState() => _BPriceCaptionState();
}

class _BPriceCaptionState extends ConsumerState<BPriceCaption> {
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    // Half a minute is finer than the caption's own resolution, so the text
    // never lags the truth by more than it can express.
    _ticker = Timer.periodic(
      const Duration(seconds: 30),
      (_) => setState(() {}),
    );
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final freshness = ref.watch(priceFreshnessForProvider(widget.ticker));
    final caption = widget.short ? freshness.shortCaption : freshness.caption;
    if (caption.isEmpty) return const SizedBox.shrink();

    if (!freshness.isLive) {
      return BStalenessCaption(caption, onDark: widget.onDark);
    }

    // A live feed gets a mark as well as its words, so "this is updating" does
    // not rest on colour alone (spec §42).
    final c = context.colors;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          margin: const EdgeInsetsDirectional.only(end: 7),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: freshness.sessionOpen
                ? c.up
                : (widget.onDark ? c.onInkMuted : c.textFaint),
          ),
        ),
        Flexible(
          child: BStalenessCaption(caption, onDark: widget.onDark),
        ),
      ],
    );
  }
}
