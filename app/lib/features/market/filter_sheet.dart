import 'package:flutter/material.dart';

import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/controls.dart';
import '../../core/widgets/motion.dart';
import '../../l10n/app_localizations.dart';
import 'numeric_filter.dart';

/// Building one condition: a figure, a comparison, and a number.
///
/// Deliberately one at a time. A form with six rows of paired inputs is a
/// screener, and a screener is a tool for somebody who already knows which
/// number they came for — this is for a reader who wants the list of 280 to be
/// shorter and is not sure yet what by.
Future<NumericFilter?> showFilterBuilder(
  BuildContext context, {
  NumericFilter? existing,
}) {
  return showModalBottomSheet<NumericFilter>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheet) => _FilterBuilder(existing: existing),
  );
}

class _FilterBuilder extends StatefulWidget {
  const _FilterBuilder({this.existing});

  final NumericFilter? existing;

  @override
  State<_FilterBuilder> createState() => _FilterBuilderState();
}

class _FilterBuilderState extends State<_FilterBuilder> {
  late FilterField _field = widget.existing?.field ?? FilterField.marketCap;
  late FilterOperator _operator =
      widget.existing?.operator ?? FilterOperator.above;
  late final TextEditingController _low = TextEditingController(
    text: _initial(widget.existing?.low),
  );
  late final TextEditingController _high = TextEditingController(
    text: _initial(widget.existing?.high),
  );

  static String _initial(double? value) {
    if (value == null) return '';
    // Whole numbers read better without a trailing zero in a form field.
    return value == value.roundToDouble()
        ? value.toStringAsFixed(0)
        : value.toString();
  }

  @override
  void dispose() {
    _low.dispose();
    _high.dispose();
    super.dispose();
  }

  double? get _lowValue =>
      double.tryParse(_low.text.trim().replaceAll(',', ''));
  double? get _highValue =>
      double.tryParse(_high.text.trim().replaceAll(',', ''));

  bool get _complete =>
      _lowValue != null &&
      (_operator != FilterOperator.between || _highValue != null);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = AppLocalizations.of(context);

    return Padding(
      // Above the keyboard, which otherwise covers the only button here.
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Container(
        // Clear of the floating nav, which otherwise sits over the only
        // button on this sheet — the same mistake the filing sheet made.
        margin: const EdgeInsets.fromLTRB(12, 12, 12, 72),
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
        decoration: BoxDecoration(
          color: c.surfaceRaised,
          borderRadius: BorderRadius.circular(BarbarianRadius.xl),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l.filterTitle,
                style: BarbarianType.titleL.copyWith(color: c.textPrimary),
              ),
              const SizedBox(height: 14),

              // Which figure.
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final field in FilterField.values)
                    BKindChip(
                      field.labelFor(l),
                      variant: _field == field
                          ? BChipVariant.solid
                          : BChipVariant.neutral,
                      onTap: () => setState(() => _field = field),
                    ),
                ],
              ),
              const SizedBox(height: 16),

              // Which way.
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final operator in FilterOperator.values)
                    BKindChip(
                      operator.labelFor(l),
                      variant: _operator == operator
                          ? BChipVariant.solid
                          : BChipVariant.neutral,
                      onTap: () => setState(() => _operator = operator),
                    ),
                ],
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: _NumberBox(
                      controller: _low,
                      unit: _field.unitFor(l),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  if (_operator == FilterOperator.between) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Text(
                        l.filterAnd,
                        style: BarbarianType.bodyM.copyWith(color: c.textMuted),
                      ),
                    ),
                    Expanded(
                      child: _NumberBox(
                        controller: _high,
                        unit: _field.unitFor(l),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                  ],
                ],
              ),

              // What this figure is and how fresh it is. §49 and §50 both:
              // a P/E is a calculation over a filing that may be a year old,
              // and half these fields come from a different document than the
              // other half.
              const SizedBox(height: 14),
              // Set apart, because it is the part that teaches. Sitting as
              // loose grey text under a form it read as small print; a reader
              // who does not know what a P/E is will not go looking in the
              // small print for it.
              Container(
                padding: const EdgeInsets.fromLTRB(13, 11, 13, 12),
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(BarbarianRadius.md),
                ),
                child: Text(
                  _field.noteFor(l),
                  style: BarbarianType.bodyS.copyWith(
                    color: c.textSecondary,
                    height: 1.5,
                  ),
                ),
              ),

              const SizedBox(height: 18),
              BPressable(
                onTap: _complete
                    ? () => Navigator.of(context).pop(
                        NumericFilter(
                          field: _field,
                          operator: _operator,
                          low: _lowValue!,
                          high: _operator == FilterOperator.between
                              ? _highValue
                              : null,
                        ),
                      )
                    : null,
                child: Container(
                  height: 52,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: _complete ? c.ink : c.hairline,
                    borderRadius: BorderRadius.circular(BarbarianRadius.pill),
                  ),
                  child: Text(
                    l.filterApply,
                    style: BarbarianType.bodyM.copyWith(
                      color: _complete ? c.onInk : c.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NumberBox extends StatelessWidget {
  const _NumberBox({
    required this.controller,
    required this.unit,
    required this.onChanged,
  });

  final TextEditingController controller;
  final String unit;

  /// Typing has to reach the parent, or the button never notices.
  ///
  /// `_complete` is read during build and a `TextEditingController` does not
  /// rebuild anything on its own — so the sheet sat with a number in the box
  /// and "Show results" greyed out, which reads as the app refusing a valid
  /// answer.
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(BarbarianRadius.md),
        border: Border.all(color: c.hairlineStrong),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              // A minus sign matters: "change today, less than 0" is the
              // question somebody asks when they want to see what fell.
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
              decoration: const InputDecoration(
                border: InputBorder.none,
                isDense: true,
              ),
            ),
          ),
          Text(
            unit,
            style: BarbarianType.labelNano.copyWith(color: c.textFaint),
          ),
        ],
      ),
    );
  }
}
