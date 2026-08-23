import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/composites.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/nav.dart';

/// Opens a published investigation on thebarbarianproject.com.
///
/// Spec §10: for V1 the full research pages are read in a WebView rather than
/// rebuilt in Flutter. Rewriting 30,000-word investigations as widgets would
/// cost weeks and immediately drift from the published text — and the published
/// text is the product.
class ArticleScreen extends StatefulWidget {
  const ArticleScreen({
    required this.url,
    required this.title,
    required this.parentTab,
    super.key,
  });

  final String url;
  final String title;
  final BNavTab parentTab;

  @override
  State<ArticleScreen> createState() => _ArticleScreenState();
}

class _ArticleScreenState extends State<ArticleScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (_) {
            if (mounted) {
              setState(() {
                _loading = false;
                _failed = true;
              });
            }
          },
        ),
      );

    final uri = Uri.tryParse(widget.url);
    if (uri != null && uri.hasScheme) {
      _controller.loadRequest(uri);
    } else {
      _failed = true;
      _loading = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final topPadding = MediaQuery.paddingOf(context).top;

    return Scaffold(
      backgroundColor: c.background,
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(16, topPadding + 8, 16, 12),
            child: Row(
              children: [
                BSoftIconButton(
                  icon: Icons.arrow_back_ios_new_rounded,
                  semanticLabel: l.back,
                  onTap: () => Navigator.of(context).maybePop(),
                ),
                const SizedBox(width: BarbarianSpace.md),
                Expanded(
                  child: Text(
                    widget.title,
                    style: BarbarianType.titleM.copyWith(color: c.textPrimary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _failed
                ? Padding(
                    padding: const EdgeInsets.all(16),
                    child: BEmptyState(
                      title: l.articleFailed,
                      body: l.articleNeedsConnection,
                      actionLabel: l.articleGoBack,
                      onAction: () => Navigator.of(context).maybePop(),
                    ),
                  )
                : Stack(
                    children: [
                      WebViewWidget(controller: _controller),
                      if (_loading)
                        ColoredBox(
                          color: c.background,
                          child: const Center(
                            child: SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
