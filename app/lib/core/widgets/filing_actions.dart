import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../l10n/app_localizations.dart';
import '../models/company.dart';
import '../models/disclosure.dart';
import '../providers.dart';
import '../theme/barbarian_theme.dart';
import 'motion.dart';
import 'nav.dart';
import 'text.dart';

/// What a reader means when they tap a filing.
///
/// They mean one of two things and the row cannot tell which: open the company
/// this is about, or read the filing itself. Home guessed "company" and Today
/// guessed "filing", so the same row did different things depending on which
/// tab you were looking at — and neither guess was right half the time.
///
/// It also fixes a dead tap. The exchange stamps `(ANFI.CA)` on filings about
/// Tycoon Investments Holding, and our directory only knows that company as
/// TYCN, so the row routed to a company document that does not exist and
/// nothing happened. **The company option is offered only when we actually
/// hold that company**, which closes the whole class rather than that one
/// ticker: any issuer the exchange names and the directory does not now
/// degrades to "read the filing" instead of to nothing at all.
Future<void> showFilingActions(
  BuildContext context,
  WidgetRef ref, {
  required Disclosure filing,
  required BNavTab from,
}) async {
  final l = AppLocalizations.of(context);
  final c = context.colors;
  final arabic = Directionality.of(context) == TextDirection.rtl;

  final directory = ref.read(companyDirectoryProvider).value?.value;
  final known = {
    for (final CompanySummary company
        in directory?.companies ?? const <CompanySummary>[])
      company.ticker,
  };
  final ticker = filing.tickers.firstWhere(known.contains, orElse: () => '');

  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheet) => Container(
      // Clear of the floating nav, which otherwise sits over the last choice
      // — the sheet rendered with "Read the filing" underneath the tab bar.
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 72),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      decoration: BoxDecoration(
        color: c.surfaceRaised,
        borderRadius: BorderRadius.circular(BarbarianRadius.xl),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Directionality(
            textDirection: isArabic(filing.titleFor(arabic))
                ? TextDirection.rtl
                : TextDirection.ltr,
            child: Text(
              filing.titleFor(arabic),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: BarbarianType.bodyM.copyWith(
                color: c.textPrimary,
                height: 1.4,
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (ticker.isNotEmpty) ...[
            _Choice(
              icon: Icons.business_outlined,
              label: l.filingOpenCompany(ticker),
              onTap: () {
                Navigator.of(sheet).pop();
                context.push(Routes.companyPath(from, ticker));
              },
            ),
            const SizedBox(height: 9),
          ],
          _Choice(
            icon: Icons.description_outlined,
            label: l.filingReadFiling,
            onTap: () {
              Navigator.of(sheet).pop();
              context.push(Routes.articlePath(from, filing.link, 'EGX filing'));
            },
          ),
        ],
      ),
    ),
  );
}

class _Choice extends StatelessWidget {
  const _Choice({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BPressable(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 52),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(BarbarianRadius.pill),
          border: Border.all(color: c.hairlineStrong),
        ),
        child: Row(
          children: [
            Icon(icon, size: 19, color: c.accent),
            const SizedBox(width: 11),
            Expanded(
              child: Text(
                label,
                style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
