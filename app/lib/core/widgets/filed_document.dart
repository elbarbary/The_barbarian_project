import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/barbarian_theme.dart';
import '../../l10n/app_localizations.dart';
import 'motion.dart';

/// A link to the document a company actually lodged with the exchange.
///
/// **Opened outside the app, not in the reader.** Every other link in ESTHMR
/// goes to the in-app WebView, and these deliberately do not: the exchange
/// serves these URLs as a *download* rather than a page, so WKWebView renders
/// nothing and the reader would show a blank sheet where a filing should be.
/// The system browser handles the download, and it also solves the challenge
/// the exchange puts in front of the file — which is why the link works from a
/// phone at all.
///
/// The card says what it is opening and where it comes from. A bare "PDF" chip
/// on a filing is a link a reader has to click to identify, and this is the
/// one place in the app where the reader leaves it.
class BFiledDocument extends StatelessWidget {
  const BFiledDocument({
    required this.url,
    this.index = 0,
    this.count = 1,
    super.key,
  });

  final String url;

  /// Which of the filing's documents this is, when it lodged more than one.
  final int index;
  final int count;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);
    final name = url.split('/').last;

    return BPressable(
      onTap: () => launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 11, 12, 11),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(BarbarianRadius.md),
          border: Border.all(color: c.hairlineStrong),
        ),
        child: Row(
          children: [
            Icon(Icons.picture_as_pdf_outlined, size: 19, color: c.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    count > 1 ? '${l.finOpenPdf} ${index + 1}/$count' : l.finOpenPdf,
                    style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: BarbarianType.labelNano.copyWith(color: c.textFaint),
                  ),
                ],
              ),
            ),
            Icon(Icons.open_in_new, size: 16, color: c.textMuted),
          ],
        ),
      ),
    );
  }
}
