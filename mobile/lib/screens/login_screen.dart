import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLogin;
  final VoidCallback? onRegister;
  const LoginScreen({super.key, required this.onLogin, this.onRegister});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _register = false;
  bool _showPass = false; // controla visibilidade da senha

  Future<void> _submit() async {
    if (_emailCtrl.text.trim().isEmpty || _passCtrl.text.isEmpty) {
      setState(() => _error = 'Preencha todos os campos.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final path = _register ? '/auth/register' : '/auth/login';
      final data = await Api.post(path, {
        'email': _emailCtrl.text.trim(),
        'password': _passCtrl.text,
      });
      final token = data?['access_token']?.toString();
      if (token != null) await Api.saveToken(token);
      if (!mounted) return;
      if (_register && widget.onRegister != null) {
        widget.onRegister!();
      } else {
        widget.onLogin();
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgBase,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SizedBox(height: 24),

            // ── Logo ──────────────────────────────────────────────────────
            Center(child: Container(
              width: 80, height: 80,
              decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
              child: const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 48),
            )),
            const SizedBox(height: 16),
            Text(
              'OursMusic',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: 6),
            Text(
              _register ? 'Crie sua conta grátis' : 'Entre na sua conta',
              textAlign: TextAlign.center,
              style: const TextStyle(color: kTextSecond, fontSize: 14),
            ),
            const SizedBox(height: 36),

            // ── Campos ────────────────────────────────────────────────────
            _InputField(
              controller: _emailCtrl,
              label: 'E-mail',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 14),
            _PasswordField(
              controller: _passCtrl,
              label: 'Senha',
              showPassword: _showPass,
              onToggle: () => setState(() => _showPass = !_showPass),
            ),

            // ── Erro ──────────────────────────────────────────────────────
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF2A0808),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  const Icon(Icons.error_outline, color: Color(0xFFF15E6C), size: 16),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFFF15E6C), fontSize: 13))),
                ]),
              ),
            ],
            const SizedBox(height: 24),

            // ── Botão principal ───────────────────────────────────────────
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kAccent,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
                child: _loading
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                    : Text(_register ? 'Criar conta' : 'Entrar'),
              ),
            ),
            const SizedBox(height: 20),

            // ── Divisor ───────────────────────────────────────────────────
            Row(children: [
              const Expanded(child: Divider(color: Color(0xFF3A3A3A))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('ou continue com', style: const TextStyle(color: kTextMuted, fontSize: 12)),
              ),
              const Expanded(child: Divider(color: Color(0xFF3A3A3A))),
            ]),
            const SizedBox(height: 16),

            // ── Botões sociais (desabilitados — TODO: configurar integração) ──
            Row(children: [
              Expanded(child: _SocialButton(
                label: 'Facebook',
                icon: _FacebookIcon(),
                // TODO: Configurar login com Facebook
                onTap: null,
              )),
              const SizedBox(width: 12),
              Expanded(child: _SocialButton(
                label: 'Google',
                icon: _GoogleIcon(),
                // TODO: Configurar login com Google
                onTap: null,
              )),
            ]),
            const SizedBox(height: 24),

            // ── Toggle login/cadastro ─────────────────────────────────────
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(
                _register ? 'Já tem conta? ' : 'Não tem conta? ',
                style: const TextStyle(color: kTextSecond, fontSize: 14),
              ),
              GestureDetector(
                onTap: () => setState(() { _register = !_register; _error = null; }),
                child: Text(
                  _register ? 'Entrar' : 'Cadastre-se',
                  style: const TextStyle(color: kAccent, fontSize: 14, fontWeight: FontWeight.w800),
                ),
              ),
            ]),
            const SizedBox(height: 16),
          ]),
        ),
      ),
    );
  }
}

// ── Campo de texto padrão ─────────────────────────────────────────────────────
class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final TextInputType? keyboardType;

  const _InputField({
    required this.controller,
    required this.label,
    required this.icon,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    keyboardType: keyboardType,
    style: const TextStyle(color: kTextPrimary),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: kTextMuted),
      prefixIcon: Icon(icon, color: kTextMuted, size: 20),
      filled: true,
      fillColor: kBgHighlight,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kAccent, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );
}

// ── Campo de senha com toggle de visibilidade ─────────────────────────────────
class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool showPassword;
  final VoidCallback onToggle;

  const _PasswordField({
    required this.controller,
    required this.label,
    required this.showPassword,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    obscureText: !showPassword,
    style: const TextStyle(color: kTextPrimary),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: kTextMuted),
      prefixIcon: const Icon(Icons.lock_outline, color: kTextMuted, size: 20),
      // Ícone de olho para mostrar/esconder senha
      suffixIcon: IconButton(
        icon: Icon(
          showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
          color: kTextMuted,
          size: 20,
        ),
        onPressed: onToggle,
        tooltip: showPassword ? 'Esconder senha' : 'Mostrar senha',
      ),
      filled: true,
      fillColor: kBgHighlight,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kAccent, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );
}

// ── Botão de login social ─────────────────────────────────────────────────────
class _SocialButton extends StatelessWidget {
  final String label;
  final Widget icon;
  final VoidCallback? onTap; // null = desabilitado

  const _SocialButton({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Opacity(
      opacity: enabled ? 1.0 : 0.45,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: kBgHighlight,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFF3A3A3A)),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            SizedBox(width: 20, height: 20, child: icon),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }
}

// ── Ícone do Facebook ─────────────────────────────────────────────────────────
class _FacebookIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: _FbPainter(),
  );
}

class _FbPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0xFF1877F2);
    canvas.drawCircle(Offset(size.width / 2, size.height / 2), size.width / 2, paint);
    final textPainter = TextPainter(
      text: const TextSpan(text: 'f', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900, fontFamily: 'Roboto')),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(canvas, Offset((size.width - textPainter.width) / 2, (size.height - textPainter.height) / 2));
  }
  @override
  bool shouldRepaint(_) => false;
}

// ── Ícone do Google ───────────────────────────────────────────────────────────
class _GoogleIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) => CustomPaint(painter: _GooglePainter());
}

class _GooglePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width / 2;

    // Arcos coloridos do Google
    final colors = [const Color(0xFF4285F4), const Color(0xFF34A853), const Color(0xFFFBBC05), const Color(0xFFEA4335)];
    for (int i = 0; i < 4; i++) {
      final paint = Paint()
        ..color = colors[i]
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3;
      canvas.drawArc(
        Rect.fromCircle(center: Offset(cx, cy), radius: r - 1.5),
        (i * 3.14159 / 2) - 0.3,
        3.14159 / 2 + 0.3,
        false,
        paint,
      );
    }
  }
  @override
  bool shouldRepaint(_) => false;
}
