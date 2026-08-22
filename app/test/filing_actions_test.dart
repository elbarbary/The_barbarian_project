import 'package:barbarian/core/models/disclosure.dart';
import 'package:barbarian/core/widgets/filing_actions.dart';
import 'package:barbarian/core/providers.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// Tapping a filing asks what the reader meant.
///
/// Home used to go straight to the company and Today straight to the filing,
/// so the same row did two different things depending on the tab it was read
/// on. Worse, the company route was taken on trust: the exchange stamps
/// `(ANFI.CA)` on filings about Tycoon Investments Holding and our directory
/// knows that company only as TYCN, so the row pushed a company document that
/// does not exist and the tap did nothing at all.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  Future<void> open(WidgetTester tester, Disclosure filing) async {
    await pumpScreen(
      tester,
      Scaffold(
        body: Consumer(
          builder: (context, ref, _) {
            // The sheet reads the directory to decide whether the company can
            // be offered, so the test has to wait for it exactly as the app
            // does — otherwise every filing looks like an unheld issuer.
            final loaded =
                ref.watch(companyDirectoryProvider).value?.value != null;
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (loaded) const Text('ready'),
                  TextButton(
                    onPressed: () => showFilingActions(
                      context,
                      ref,
                      filing: filing,
                      from: BNavTab.today,
                    ),
                    child: const Text('tap'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
    await pumpUntil(tester, find.text('ready'));
    await tester.tap(find.text('tap'));
    await tester.pumpAndSettle();
  }

  testWidgets('a known company offers both choices, fully on screen', (
    tester,
  ) async {
    await open(
      tester,
      const Disclosure(
        id: 'egx-1',
        title: 'البنك التجاري الدولي (COMI.CA) تعلن نتائج أعمالها',
        tickers: ['COMI'],
        link: 'https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=1',
      ),
    );

    expect(find.text('Open COMI'), findsOneWidget);
    expect(find.text('Read the filing'), findsOneWidget);

    // The choices sat under the floating nav bar the first time this was
    // built, so the last one was unreachable.
    final surface = tester.view.physicalSize.height / tester.view.devicePixelRatio;
    expect(
      tester.getRect(find.text('Read the filing')).bottom,
      lessThan(surface),
      reason: 'the last choice is off the bottom of the screen',
    );
  });

  testWidgets('an issuer we do not hold offers only the filing', (
    tester,
  ) async {
    await open(
      tester,
      const Disclosure(
        id: 'egx-293685',
        title: 'تايكون أنفستمنتس هولدنج (ANFI.CA)',
        tickers: ['ANFI'],
        link: 'https://www.egx.com.eg/ar/NewsDetails.aspx?NewsID=293685',
      ),
    );

    expect(
      find.textContaining('Open ANFI'),
      findsNothing,
      reason: 'ANFI has no company document — offering it is the dead tap',
    );
    expect(find.text('Read the filing'), findsOneWidget);
  });
}
