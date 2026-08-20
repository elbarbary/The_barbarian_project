import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/models/exit_liquidity.dart';
import 'package:barbarian/core/widgets/nav.dart';
import 'package:barbarian/features/company/company_screen.dart';
import 'package:barbarian/features/exit/exit_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/harness.dart';

/// "Can I get out?" — the screen that comes closest to being about a reader's
/// own money, so the rules that keep it publishable are the ones tested.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(useInMemoryPreferences);

  Company load(String ticker) =>
      Company.fromJson(readFixtureObjectSync('companies/$ticker.json'));

  test('the ladder is fixed, published, and the same for everyone', () {
    // Spec §8.7. The moment this takes an amount from the reader it is doing
    // arithmetic on their position, which is advice about that position — so
    // the rungs are constants and there is no way to pass one in.
    expect(ExitLiquidity.ladder, [10000, 50000, 250000, 1000000]);
  });

  test('a share that stops trading says so, from real sessions', () {
    // SEIGA did not trade at all on any of the sessions we hold. That is the
    // most useful honest thing the app can tell somebody about getting out,
    // and it exists only because price_history now carries volume.
    final exit = ExitLiquidity.of(load('SEIGA'));
    expect(exit, isNotNull);
    expect(exit!.stops, isTrue);
    expect(exit.zeroVolumeDays, greaterThan(0));
    expect(exit.zeroVolumeDays, lessThanOrEqualTo(exit.sessions));
  });

  test('a liquid name does not cry wolf', () {
    final exit = ExitLiquidity.of(load('COMI'));
    expect(exit, isNotNull);
    expect(exit!.zeroVolumeDays, 0);
  });

  test('the sums agree with the sentences', () {
    final exit = ExitLiquidity.of(load('COMI'))!;
    for (final amount in ExitLiquidity.ladder) {
      final share = exit.shareOfDay(amount);
      final sessions = exit.sessionsToSell(amount);
      // Sessions is the share divided by the stated participation rate, so
      // the two figures on a row can never disagree.
      expect(sessions, closeTo(share / ExitLiquidity.participation, 0.0001));
      // Bigger money is never easier to move.
      expect(share, greaterThan(0));
    }
    expect(
      exit.shareOfDay(1000000),
      greaterThan(exit.shareOfDay(10000)),
    );
  });

  test('no published trading produces no answer, never a guess', () {
    const bare = Company(
      ticker: 'NONE',
      name: LocalizedName(en: 'A company with no series'),
    );
    expect(ExitLiquidity.of(bare), isNull);
  });

  test('a wait too long to picture is converted, not printed raw', () {
    // SPHT trades about EGP 84 on a normal day, so a million pounds is 59,239
    // sessions. That figure is correct and unreadable; above a year it becomes
    // years, which is a unit change rather than a claim.
    final exit = ExitLiquidity.of(load('SPHT'))!;
    final wait = exit.waitFor(1000000);
    expect(wait, contains('years'));
    expect(wait, isNot(contains('sessions to sell')));

    // And a liquid name still reports in sessions.
    final comi = ExitLiquidity.of(load('COMI'))!;
    expect(comi.waitFor(10000), anyOf(contains('day'), contains('sessions')));
  });

  test('the words are mechanism, never instruction', () {
    final exit = ExitLiquidity.of(load('COMI'))!;
    const banned = [
      'you should', 'we recommend', 'avoid', 'too risky', 'safe to',
      'worth buying', 'do not buy', 'good investment',
    ];
    for (final amount in ExitLiquidity.ladder) {
      final plain = exit.plainFor(amount).toLowerCase();
      for (final phrase in banned) {
        expect(plain, isNot(contains(phrase)), reason: 'says "$phrase"');
      }
    }
  });

  testWidgets('a company that stops trading says so on its own page', (
    tester,
  ) async {
    // The question has to reach somebody standing on the company's page, not
    // only somebody who thought to go looking for it. And it is placed by
    // severity: a share that stops trading gets this above the study, because
    // whether you can sell comes before what it scored.
    await pumpScreen(
      tester,
      const CompanyScreen(ticker: 'SPHT', parentTab: BNavTab.home),
      until: find.byType(CompanyScreen),
    );
    await pumpUntil(tester, find.text('IT STOPS TRADING'));
    expect(find.textContaining('no price at which a holder could sell'),
        findsWidgets);
  });

  testWidgets('a liquid company gets the quiet version', (tester) async {
    await pumpScreen(
      tester,
      const CompanyScreen(ticker: 'COMI', parentTab: BNavTab.home),
      until: find.byType(CompanyScreen),
    );
    await pumpUntil(tester, find.text('CAN I GET OUT?'));
    // Never the alarm on a name that trades every session.
    expect(find.text('IT STOPS TRADING'), findsNothing);
  });

  testWidgets('the screen states the limit and the assumption', (tester) async {
    await pumpScreen(
      tester,
      const ExitScreen(parentTab: BNavTab.home, ticker: 'COMI'),
      until: find.text('Can I get out?'),
    );
    // Wait on a ladder rung, not on prose: "a normal day" also appears in the
    // primer above, so matching it proved nothing about the company block
    // having loaded — and the assumption text below it never rendered.
    await pumpUntil(tester, find.textContaining('EGP 10,000'));

    // The mechanism a reader cannot be expected to know.
    expect(find.textContaining('20%'), findsWidgets);

    // And the assumption behind the sessions figure. The scaffold builds
    // lazily, so this has to be scrolled to rather than merely looked for.
    await tester.scrollUntilVisible(
      find.textContaining('a fifth'),
      120,
      scrollable: find.byType(Scrollable).first,
      maxScrolls: 30,
    );
    expect(
      find.textContaining('a fifth'),
      findsWidgets,
      reason: 'the participation assumption must be stated where it is used, '
          'so a reader can disagree with it',
    );
  });
}
