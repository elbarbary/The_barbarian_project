import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../l10n/app_localizations.dart';

/// Sign in with an address and a six-digit code.
///
/// Two steps rather than one screen, because the second cannot be attempted
/// until the first has succeeded — and because a reader who mistypes their
/// address should be able to go back without losing the sheet.
///
/// Nothing is stored until the code is accepted, so an abandoned attempt
/// leaves the device exactly as it was.
class EmailGateSheet extends ConsumerStatefulWidget {
  const EmailGateSheet({super.key});

  static Future<bool> show(BuildContext context) async =>
      await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (_) => const EmailGateSheet(),
      ) ??
      false;

  @override
  ConsumerState<EmailGateSheet> createState() => _EmailGateSheetState();
}

class _EmailGateSheetState extends ConsumerState<EmailGateSheet> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  bool _onCode = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final address = _email.text.trim();
    if (!address.contains('@') || !address.contains('.')) {
      setState(() => _error = AppLocalizations.of(context).emailGateBadEmail);
      return;
    }
    await _attempt(() async {
      await ref.read(authControllerProvider.notifier).requestCode(address);
      if (mounted) setState(() => _onCode = true);
    });
  }

  Future<void> _verify() async {
    await _attempt(() async {
      await ref
          .read(authControllerProvider.notifier)
          .signInWithCode(_email.text.trim(), _code.text.trim());
      if (mounted) Navigator.of(context).pop(true);
    });
  }

  /// Runs one step, showing the server's own words when it refuses. The
  /// message is the server's because it is more specific than anything this
  /// screen could guess — "that code is not right" beats "sign-in failed".
  Future<void> _attempt(Future<void> Function() step) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await step();
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        ),
        padding: const EdgeInsets.fromLTRB(22, 16, 22, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: c.hairlineStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(l.emailGateTitle, style: BarbarianType.headlineM),
            const SizedBox(height: 6),
            Text(
              l.emailGateLead,
              style: BarbarianType.bodyS.copyWith(
                color: c.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),

            if (!_onCode) ...[
              _Field(
                controller: _email,
                label: l.emailGateField,
                hint: l.emailGateHint,
                keyboard: TextInputType.emailAddress,
                autofill: const [AutofillHints.email],
                onSubmit: _send,
              ),
              const SizedBox(height: 14),
              _Action(
                label: _busy ? l.emailGateSending : l.emailGateSend,
                onTap: _busy ? null : _send,
              ),
            ] else ...[
              _Field(
                controller: _code,
                label: l.emailGateCodeField,
                hint: '000000',
                keyboard: TextInputType.number,
                autofill: const [AutofillHints.oneTimeCode],
                formatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(6),
                ],
                onSubmit: _verify,
              ),
              const SizedBox(height: 14),
              _Action(
                label: _busy ? l.emailGateSending : l.emailGateVerify,
                onTap: _busy ? null : _verify,
              ),
              const SizedBox(height: 6),
              Center(
                child: TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                          _onCode = false;
                          _error = null;
                        }),
                  child: Text(
                    l.emailGateOther,
                    style: BarbarianType.bodyS.copyWith(color: c.textMuted),
                  ),
                ),
              ),
            ],

            if (_error case final String message) ...[
              const SizedBox(height: 12),
              Text(
                message,
                style: BarbarianType.bodyS.copyWith(color: c.down),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.hint,
    required this.keyboard,
    required this.autofill,
    required this.onSubmit,
    this.formatters,
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final TextInputType keyboard;
  final List<String> autofill;
  final VoidCallback onSubmit;
  final List<TextInputFormatter>? formatters;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: BarbarianType.labelNano.copyWith(color: c.textFaint),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboard,
          autofillHints: autofill,
          inputFormatters: formatters,
          autofocus: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => onSubmit(),
          style: BarbarianType.bodyM.copyWith(color: c.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: BarbarianType.bodyM.copyWith(color: c.textFaint),
            filled: true,
            fillColor: c.surfaceRaised,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 13,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: BorderSide(color: c.hairlineStrong),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(11),
              borderSide: BorderSide(color: c.hairlineStrong),
            ),
          ),
        ),
      ],
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({required this.label, required this.onTap});

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          backgroundColor: c.actionSurface,
          foregroundColor: c.onAction,
          padding: const EdgeInsets.symmetric(vertical: 15),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Text(label, style: BarbarianType.labelS),
      ),
    );
  }
}
