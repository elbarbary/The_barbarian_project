import 'package:flutter/material.dart';

import '../theme/barbarian_theme.dart';

/// The outlet's own lead picture, beside its headline.
///
/// A column of text rows is hard to scan and hard to tell apart, and the
/// picture an editor chose for a story is the cheapest way to make it
/// recognisable. It links back to their article, which is the same bargain
/// every reader app makes.
///
/// **The whole design problem here is failure.** These are remote files on
/// somebody else's server: about half the feed has no picture at all — Arab
/// Finance is read from a sitemap and publishes none — and of the ones that
/// do, some will 404, some will be served over a connection the reader does
/// not have, and some will arrive after the row has been read. A row must look
/// deliberate in every one of those cases, and a broken-image glyph is the one
/// outcome that looks like a bug rather than a story without a picture.
///
/// So the widget owns its own trailing gap. When there is nothing to show it
/// collapses the picture *and* the space beside it, and the row closes up as
/// though it had never asked for one. The parent cannot do this, because the
/// parent does not find out that a download failed.
class BNewsThumb extends StatefulWidget {
  const BNewsThumb({
    super.key,
    required this.url,
    this.size = 56,
    this.gap = 12,
  });

  /// The picture's address, or null when the outlet published none.
  final String? url;

  /// Side of the square. Small on purpose: it identifies a story, it does not
  /// illustrate it, and the headline stays the thing being read.
  final double size;

  /// Space between the picture and the text, collapsed along with it.
  final double gap;

  @override
  State<BNewsThumb> createState() => _BNewsThumbState();
}

class _BNewsThumbState extends State<BNewsThumb> {
  /// Set once the download fails. Kept in state rather than handled inside
  /// `errorBuilder` because a builder cannot un-reserve the space its own
  /// parent already laid out — returning an empty box from it leaves a
  /// 56-point hole where the picture would have been.
  bool _failed = false;

  @override
  void didUpdateWidget(covariant BNewsThumb old) {
    super.didUpdateWidget(old);
    // Rows are recycled as the list scrolls, so a new address deserves a fresh
    // attempt rather than inheriting the last row's failure.
    if (old.url != widget.url) _failed = false;
  }

  @override
  Widget build(BuildContext context) {
    final address = widget.url?.trim() ?? '';
    if (address.isEmpty || _failed) return const SizedBox.shrink();

    final size = widget.size;
    final c = context.colors;
    return Padding(
      padding: EdgeInsetsDirectional.only(end: widget.gap),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(BarbarianRadius.sm),
        child: SizedBox(
          width: size,
          height: size,
          child: Image.network(
            address,
            width: size,
            height: size,
            fit: BoxFit.cover,
            // Decoded at roughly the size it is drawn at. A newspaper's lead
            // image is routinely 1600px wide, and decoding twenty of those at
            // full size to paint them 56 points across is how a feed screen
            // runs out of memory on a cheap phone.
            cacheWidth: (size * MediaQuery.devicePixelRatioOf(context)).round(),
            // A tinted block, not a spinner. The row is readable without the
            // picture, and a spinner per row makes a calm feed look busy.
            loadingBuilder: (context, child, progress) => progress == null
                ? child
                : ColoredBox(color: c.hairline, child: const SizedBox.expand()),
            // The failure case: show nothing at all. Not a placeholder, not an
            // icon. A story with a dead image link is a story without a
            // picture, and it should read as one.
            errorBuilder: (context, _, _) {
              // Collapse on the next frame; setState during build is illegal.
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted && !_failed) setState(() => _failed = true);
              });
              return ColoredBox(color: c.hairline, child: const SizedBox.expand());
            },
          ),
        ),
      ),
    );
  }
}
