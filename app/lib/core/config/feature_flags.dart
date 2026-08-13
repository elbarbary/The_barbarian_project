/// Spec §46. These exist so the shape of the app can accommodate regulated
/// functionality later without any of it existing now.
///
/// Every flag is `false` and there is **no hidden UI behind any of them**. A
/// flag being false must mean the feature is absent, not merely concealed —
/// checking a flag to decide whether to draw a disabled button would defeat
/// the point.
library;

import 'package:flutter/foundation.dart';

@immutable
abstract final class FeatureFlags {
  /// Structured buy/sell calls with entries, targets and stops (spec §28, §61).
  static const bool enablePublicCalls = false;

  /// User-authored algorithms, backtests and public signals (spec §44).
  static const bool enablePublicAlgorithms = false;

  /// Any AI-generated recommendation or assistant (spec §43).
  static const bool enableAiRecommendations = false;

  /// Holdings, cost basis, portfolio tracking or allocation advice (spec §33, §61).
  static const bool enablePortfolios = false;

  /// Brokerage account linking and order routing (spec §45).
  static const bool enableBrokerConnections = false;

  /// Ranking users by realised market performance (spec §32).
  static const bool enablePerformanceLeaderboards = false;

  /// Paid tiers. The design canvas shows a "PRO" badge; spec §61 lists a paid
  /// subscription system as a V1 non-goal, so the badge is not built.
  static const bool enablePaidTiers = false;
}
