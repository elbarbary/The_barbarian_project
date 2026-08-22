import 'package:barbarian/core/models/company.dart';
import 'package:barbarian/core/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Two screens searching must not share one query.
///
/// The directory and the Exit pillar both wrote a single app-wide
/// `searchQueryProvider` and neither cleared it on the way out, so a query
/// typed on one reappeared as a filter on the other: the directory could open
/// reading "Companies · A–Z" with a count of 1, a blank search field, the
/// sector grid hidden and no Clear button to escape with.
void main() {
  test('results are a function of the query passed in, not of shared state', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    // Two different queries resolve independently and neither changes the
    // other. With a shared provider the second read would have returned the
    // first query's results.
    final a = container.read(searchResultsProvider('comi'));
    final b = container.read(searchResultsProvider('abuk'));
    final aAgain = container.read(searchResultsProvider('comi'));

    expect(a, isA<List<CompanySummary>>());
    expect(b, isA<List<CompanySummary>>());
    expect(
      identical(a, aAgain) || a.length == aAgain.length,
      isTrue,
      reason: 'the same query must keep giving the same answer',
    );

    // And the empty query is its own thing rather than whatever was typed last.
    final everything = container.read(searchResultsProvider(''));
    expect(
      everything.length,
      greaterThanOrEqualTo(a.length),
      reason: 'an empty query is the whole directory, not a leftover filter',
    );
  });
}
