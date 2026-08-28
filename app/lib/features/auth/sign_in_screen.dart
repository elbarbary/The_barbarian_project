import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/barbarian_theme.dart';
import '../../core/widgets/motion.dart';
import 'email_gate_sheet.dart';
import '../../l10n/app_localizations.dart';

/// The gate: the one screen shown before an identity exists.
///
/// Four ways in, and none of them a dead end. Email is the one that reaches
/// the live exchange, because the feed now requires a session and a code is
/// what proves an inbox. Apple and Google establish a local account with its
/// own watchlist; guest asks for nothing. All three of those read the sample
/// data that ships in the app until a session exists. The choice is
/// remembered, so the gate is a first-run screen, not a wall.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

enum _Method { email, apple, google, guest }

class _SignInScreenState extends ConsumerState<SignInScreen> {
  _Method? _busy;
  String? _error;

  Future<void> _run(_Method method, Future<void> Function() action) async {
    if (_busy != null) return;
    setState(() {
      _busy = method;
      _error = null;
    });
    try {
      await action();
      // On success the gate is replaced by the app, so there is nothing to do
      // here — this widget is disposed.
    } on AuthException catch (e) {
      if (!mounted) return;
      // A person backing out of the provider sheet is not an error.
      setState(() {
        _busy = null;
        _error = e.cancelled ? null : AppLocalizations.of(context).signInFailed;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = null;
        _error = AppLocalizations.of(context).signInFailed;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final c = context.colors;
    final auth = ref.read(authControllerProvider.notifier);

    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(gradient: c.pageGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(flex: 2),
                Text(
                  l.appName,
                  style: BarbarianType.displayXL.copyWith(color: c.textPrimary),
                ),
                const SizedBox(height: 8),
                Text(
                  l.appTagline,
                  style: BarbarianType.headlineM.copyWith(color: c.textMuted),
                ),
                const SizedBox(height: 18),
                Text(
                  l.signInLead,
                  style: BarbarianType.bodyM.copyWith(
                    color: c.textSecondary,
                    height: 1.55,
                  ),
                ),
                const Spacer(flex: 3),

                if (_error case final String message) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      message,
                      style: BarbarianType.bodyS.copyWith(color: c.down),
                    ),
                  ),
                ],

                _AuthButton(
                  label: l.signInEmail,
                  onTap: () async {
                    if (_busy != null) return;
                    setState(() => _error = null);
                    // The sheet reports its own failures; the gate only has to
                    // know whether an identity now exists.
                    await EmailGateSheet.show(context);
                  },
                  busy: _busy == _Method.email,
                  enabled: _busy == null,
                  filled: true,
                  leading: Icon(Icons.alternate_email, size: 20, color: c.onInk),
                ),
                const SizedBox(height: 12),
                _AuthButton(
                  label: l.signInApple,
                  onTap: () => _run(_Method.apple, auth.signInWithApple),
                  busy: _busy == _Method.apple,
                  enabled: _busy == null,
                  filled: false,
                  leading: Icon(Icons.apple, size: 22, color: c.onInk),
                ),
                const SizedBox(height: 12),
                _AuthButton(
                  label: l.signInGoogle,
                  onTap: () => _run(_Method.google, auth.signInWithGoogle),
                  busy: _busy == _Method.google,
                  enabled: _busy == null,
                  filled: false,
                  leading: const _GoogleMark(),
                ),
                const SizedBox(height: 20),

                Center(
                  child: BPressable(
                    onTap: _busy == null
                        ? () => _run(_Method.guest, auth.continueAsGuest)
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      child: Text(
                        l.signInGuest,
                        style: BarbarianType.label.copyWith(color: c.accent),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    l.signInGuestNote,
                    textAlign: TextAlign.center,
                    style: BarbarianType.bodyS.copyWith(
                      color: c.textFaint,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// One provider button: a filled ink slab (Apple) or a bordered surface (the
/// rest). Shows a spinner in place of its label while its own call is running,
/// and dims when another button is busy.
class _AuthButton extends StatelessWidget {
  const _AuthButton({
    required this.label,
    required this.onTap,
    required this.busy,
    required this.enabled,
    required this.filled,
    required this.leading,
  });

  final String label;
  final VoidCallback onTap;
  final bool busy;
  final bool enabled;
  final bool filled;
  final Widget leading;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fg = filled ? c.onInk : c.textPrimary;
    return Opacity(
      opacity: enabled || busy ? 1 : 0.5,
      child: BPressable(
        onTap: enabled ? onTap : null,
        child: Container(
          height: 54,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: filled ? c.ink : c.surface,
            borderRadius: BorderRadius.circular(BarbarianRadius.lg),
            border: filled ? null : Border.all(color: c.hairlineStrong),
          ),
          child: busy
              ? SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.2, color: fg),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    leading,
                    const SizedBox(width: 12),
                    Text(
                      label,
                      style: BarbarianType.label.copyWith(color: fg),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

/// A small, self-contained Google wordmark "G" — no network asset, so the
/// button renders the same offline as on.
class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
      child: const Text(
        'G',
        style: TextStyle(
          fontSize: 15,
          height: 1.0,
          fontWeight: FontWeight.w700,
          // Google blue — the mark reads as Google without shipping its logo.
          color: Color(0xFF4285F4),
        ),
      ),
    );
  }
}
