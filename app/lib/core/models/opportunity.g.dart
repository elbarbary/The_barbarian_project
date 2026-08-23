// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'opportunity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OpportunityReport _$OpportunityReportFromJson(Map<String, dynamic> json) =>
    _OpportunityReport(
      date: json['date'] as String?,
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      headline: json['headline'] as String?,
      mastheadDate: json['masthead_date'] as String?,
      rubric:
          (json['rubric'] as List<dynamic>?)
              ?.map((e) => RubricComponent.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <RubricComponent>[],
      scoring: json['scoring'] == null
          ? const ScoringGuide()
          : ScoringGuide.fromJson(json['scoring'] as Map<String, dynamic>),
      sector: json['sector'] == null
          ? null
          : SectorContext.fromJson(json['sector'] as Map<String, dynamic>),
      coverage: json['coverage'] == null
          ? const ScannerCoverage()
          : ScannerCoverage.fromJson(json['coverage'] as Map<String, dynamic>),
      summary: json['summary'] == null
          ? const ScannerSummary()
          : ScannerSummary.fromJson(json['summary'] as Map<String, dynamic>),
      qualified:
          (json['qualified'] as List<dynamic>?)
              ?.map((e) => ScannedCompany.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScannedCompany>[],
      watching:
          (json['watching'] as List<dynamic>?)
              ?.map((e) => ScannedCompany.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScannedCompany>[],
      rejected:
          (json['rejected'] as List<dynamic>?)
              ?.map((e) => ScannedCompany.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScannedCompany>[],
      outcomes:
          (json['outcomes'] as List<dynamic>?)
              ?.map((e) => ScanOutcome.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScanOutcome>[],
    );

Map<String, dynamic> _$OpportunityReportToJson(_OpportunityReport instance) =>
    <String, dynamic>{
      'date': instance.date,
      'updated_at': instance.updatedAt?.toIso8601String(),
      'headline': instance.headline,
      'masthead_date': instance.mastheadDate,
      'rubric': instance.rubric,
      'scoring': instance.scoring,
      'sector': instance.sector,
      'coverage': instance.coverage,
      'summary': instance.summary,
      'qualified': instance.qualified,
      'watching': instance.watching,
      'rejected': instance.rejected,
      'outcomes': instance.outcomes,
    };

_ScannerCoverage _$ScannerCoverageFromJson(Map<String, dynamic> json) =>
    _ScannerCoverage(
      thndr: (json['thndr'] as num?)?.toInt() ?? 0,
      egx: (json['egx'] as num?)?.toInt() ?? 0,
      adjustedHistories: (json['adjusted_histories'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ScannerCoverageToJson(_ScannerCoverage instance) =>
    <String, dynamic>{
      'thndr': instance.thndr,
      'egx': instance.egx,
      'adjusted_histories': instance.adjustedHistories,
    };

_ScannerSummary _$ScannerSummaryFromJson(Map<String, dynamic> json) =>
    _ScannerSummary(
      qualified: (json['qualified'] as num?)?.toInt() ?? 0,
      watching: (json['watching'] as num?)?.toInt() ?? 0,
      rejected: (json['rejected'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ScannerSummaryToJson(_ScannerSummary instance) =>
    <String, dynamic>{
      'qualified': instance.qualified,
      'watching': instance.watching,
      'rejected': instance.rejected,
    };

_ScannedCompany _$ScannedCompanyFromJson(Map<String, dynamic> json) =>
    _ScannedCompany(
      ticker: json['ticker'] as String,
      score: (json['score'] as num?)?.toInt() ?? 0,
      maxScore: (json['max_score'] as num?)?.toInt() ?? 13,
      status: json['status'] as String? ?? 'rejected',
      statusLabel: json['status_label'] as String?,
      statusLabelAr: json['status_label_ar'] as String?,
      seenAt: json['seen_at'] as String?,
      movePercent: json['move_percent'] as String?,
      headline: json['headline'] as String?,
      catalyst: json['catalyst'] as String?,
      publishedAt: json['published_at'] == null
          ? null
          : DateTime.parse(json['published_at'] as String),
      scores: json['scores'] == null
          ? const ScanScores()
          : ScanScores.fromJson(json['scores'] as Map<String, dynamic>),
      researchSummary: json['research_summary'] as String?,
      rank: (json['rank'] as num?)?.toInt(),
      state: json['state'] as String?,
      action: json['action'] == null
          ? null
          : ScanAction.fromJson(json['action'] as Map<String, dynamic>),
      positionWithheld: json['position_withheld'] as bool? ?? false,
      gates:
          (json['gates'] as List<dynamic>?)
              ?.map((e) => ScanGate.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScanGate>[],
      research:
          (json['research'] as List<dynamic>?)
              ?.map((e) => ResearchSection.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ResearchSection>[],
      tape: json['tape'] == null
          ? null
          : ScanTape.fromJson(json['tape'] as Map<String, dynamic>),
      sources:
          (json['sources'] as List<dynamic>?)
              ?.map((e) => ResearchSource.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ResearchSource>[],
    );

Map<String, dynamic> _$ScannedCompanyToJson(_ScannedCompany instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'score': instance.score,
      'max_score': instance.maxScore,
      'status': instance.status,
      'status_label': instance.statusLabel,
      'status_label_ar': instance.statusLabelAr,
      'seen_at': instance.seenAt,
      'move_percent': instance.movePercent,
      'headline': instance.headline,
      'catalyst': instance.catalyst,
      'published_at': instance.publishedAt?.toIso8601String(),
      'scores': instance.scores,
      'research_summary': instance.researchSummary,
      'rank': instance.rank,
      'state': instance.state,
      'action': instance.action,
      'position_withheld': instance.positionWithheld,
      'gates': instance.gates,
      'research': instance.research,
      'tape': instance.tape,
      'sources': instance.sources,
    };

_ScanScores _$ScanScoresFromJson(Map<String, dynamic> json) => _ScanScores(
  freshDisclosure: (json['fresh_disclosure'] as num?)?.toInt() ?? 0,
  economicImportance: (json['economic_importance'] as num?)?.toInt() ?? 0,
  volumeConfirmation: (json['volume_confirmation'] as num?)?.toInt() ?? 0,
  ownershipCluster: (json['ownership_cluster'] as num?)?.toInt() ?? 0,
  datedCatalyst: (json['dated_catalyst'] as num?)?.toInt() ?? 0,
  antiChasing: (json['anti_chasing'] as num?)?.toInt() ?? 0,
  limitUpPenalty: (json['limit_up_penalty'] as num?)?.toInt() ?? 0,
  issuerDenial: (json['issuer_denial'] as num?)?.toInt() ?? 0,
  riskPenalty: (json['risk_penalty'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$ScanScoresToJson(_ScanScores instance) =>
    <String, dynamic>{
      'fresh_disclosure': instance.freshDisclosure,
      'economic_importance': instance.economicImportance,
      'volume_confirmation': instance.volumeConfirmation,
      'ownership_cluster': instance.ownershipCluster,
      'dated_catalyst': instance.datedCatalyst,
      'anti_chasing': instance.antiChasing,
      'limit_up_penalty': instance.limitUpPenalty,
      'issuer_denial': instance.issuerDenial,
      'risk_penalty': instance.riskPenalty,
    };

_ScoringGuide _$ScoringGuideFromJson(Map<String, dynamic> json) =>
    _ScoringGuide(
      bands:
          (json['bands'] as List<dynamic>?)
              ?.map((e) => ScoringBand.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <ScoringBand>[],
      notes:
          (json['notes'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          const <String>[],
    );

Map<String, dynamic> _$ScoringGuideToJson(_ScoringGuide instance) =>
    <String, dynamic>{'bands': instance.bands, 'notes': instance.notes};

_ScoringBand _$ScoringBandFromJson(Map<String, dynamic> json) => _ScoringBand(
  score: (json['score'] as num?)?.toInt() ?? 0,
  label: json['label'] as String? ?? '',
  labelAr: json['label_ar'] as String?,
);

Map<String, dynamic> _$ScoringBandToJson(_ScoringBand instance) =>
    <String, dynamic>{
      'score': instance.score,
      'label': instance.label,
      'label_ar': instance.labelAr,
    };

_RubricComponent _$RubricComponentFromJson(Map<String, dynamic> json) =>
    _RubricComponent(
      label: json['label'] as String,
      labelAr: json['label_ar'] as String?,
      detail: json['detail'] as String?,
      detailAr: json['detail_ar'] as String?,
      weight: (json['weight'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$RubricComponentToJson(_RubricComponent instance) =>
    <String, dynamic>{
      'label': instance.label,
      'label_ar': instance.labelAr,
      'detail': instance.detail,
      'detail_ar': instance.detailAr,
      'weight': instance.weight,
    };

_ScanOutcome _$ScanOutcomeFromJson(Map<String, dynamic> json) => _ScanOutcome(
  ticker: json['ticker'] as String,
  label: json['label'] as String?,
  status: json['status'] as String? ?? 'rejected',
  statusLabel: json['status_label'] as String?,
  statusLabelAr: json['status_label_ar'] as String?,
  returnPercent: json['return_percent'] as String?,
  direction: json['direction'] as String? ?? 'up',
  note: json['note'] as String?,
);

Map<String, dynamic> _$ScanOutcomeToJson(_ScanOutcome instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'label': instance.label,
      'status': instance.status,
      'status_label': instance.statusLabel,
      'status_label_ar': instance.statusLabelAr,
      'return_percent': instance.returnPercent,
      'direction': instance.direction,
      'note': instance.note,
    };

_ResearchSource _$ResearchSourceFromJson(Map<String, dynamic> json) =>
    _ResearchSource(name: json['name'] as String, url: json['url'] as String?);

Map<String, dynamic> _$ResearchSourceToJson(_ResearchSource instance) =>
    <String, dynamic>{'name': instance.name, 'url': instance.url};

_ScanGate _$ScanGateFromJson(Map<String, dynamic> json) => _ScanGate(
  label: json['label'] as String,
  outcome: json['outcome'] as String? ?? 'warn',
);

Map<String, dynamic> _$ScanGateToJson(_ScanGate instance) => <String, dynamic>{
  'label': instance.label,
  'outcome': instance.outcome,
};

_ScanTape _$ScanTapeFromJson(Map<String, dynamic> json) => _ScanTape(
  label: json['label'] as String?,
  price: json['price'] as String?,
  detail: json['detail'] as String?,
);

Map<String, dynamic> _$ScanTapeToJson(_ScanTape instance) => <String, dynamic>{
  'label': instance.label,
  'price': instance.price,
  'detail': instance.detail,
};

_SectorContext _$SectorContextFromJson(Map<String, dynamic> json) =>
    _SectorContext(
      title: json['title'] as String,
      kicker: json['kicker'] as String?,
      thesis: json['thesis'] as String?,
      timeline:
          (json['timeline'] as List<dynamic>?)
              ?.map((e) => SectorFact.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <SectorFact>[],
      members:
          (json['members'] as List<dynamic>?)
              ?.map((e) => SectorMember.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <SectorMember>[],
    );

Map<String, dynamic> _$SectorContextToJson(_SectorContext instance) =>
    <String, dynamic>{
      'title': instance.title,
      'kicker': instance.kicker,
      'thesis': instance.thesis,
      'timeline': instance.timeline,
      'members': instance.members,
    };

_SectorFact _$SectorFactFromJson(Map<String, dynamic> json) => _SectorFact(
  label: json['label'] as String,
  value: json['value'] as String,
  detail: json['detail'] as String?,
);

Map<String, dynamic> _$SectorFactToJson(_SectorFact instance) =>
    <String, dynamic>{
      'label': instance.label,
      'value': instance.value,
      'detail': instance.detail,
    };

_SectorMember _$SectorMemberFromJson(Map<String, dynamic> json) =>
    _SectorMember(
      ticker: json['ticker'] as String,
      role: json['role'] as String?,
      price: json['price'] as String?,
      qualifier: json['qualifier'] as String?,
    );

Map<String, dynamic> _$SectorMemberToJson(_SectorMember instance) =>
    <String, dynamic>{
      'ticker': instance.ticker,
      'role': instance.role,
      'price': instance.price,
      'qualifier': instance.qualifier,
    };

_ResearchSection _$ResearchSectionFromJson(Map<String, dynamic> json) =>
    _ResearchSection(
      heading: json['heading'] as String?,
      body:
          (json['body'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          const <String>[],
    );

Map<String, dynamic> _$ResearchSectionToJson(_ResearchSection instance) =>
    <String, dynamic>{'heading': instance.heading, 'body': instance.body};

_ScanAction _$ScanActionFromJson(Map<String, dynamic> json) => _ScanAction(
  label: json['label'] as String?,
  decision: json['decision'] as String?,
  reasoning:
      (json['reasoning'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
);

Map<String, dynamic> _$ScanActionToJson(_ScanAction instance) =>
    <String, dynamic>{
      'label': instance.label,
      'decision': instance.decision,
      'reasoning': instance.reasoning,
    };
