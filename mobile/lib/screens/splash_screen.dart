import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';

// ── WavePainter (compartilhado) ───────────────────────────────────────────────

class WavePainter extends CustomPainter {
  final double phase;
  final Color color;
  final double strokeWidth;

  const WavePainter({
    required this.phase,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final W = size.width;
    final H = size.height;
    final cy = H / 2;
    final amp = H * 0.28;
    final freq = (2 * pi) / W;
    final path = _buildPath(W, cy, amp, freq);

    // glow
    canvas.drawPath(path, Paint()
      ..color = color.withValues(alpha: 0.3)
      ..strokeWidth = strokeWidth * 1.8
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, strokeWidth * 2));

    // main
    canvas.drawPath(path, Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round);
  }

  Path _buildPath(double W, double cy, double amp, double freq) {
    final path = Path();
    for (int x = 0; x <= W.toInt(); x++) {
      final y = cy + amp * sin(freq * x * 2.2 + phase);
      x == 0 ? path.moveTo(x.toDouble(), y) : path.lineTo(x.toDouble(), y);
    }
    return path;
  }

  @override
  bool shouldRepaint(WavePainter old) => old.phase != phase || old.color != color;
}

// ── OursMusicLogo (reutilizavel em qualquer tela) ─────────────────────────────

class OursMusicLogo extends StatefulWidget {
  final double size;
  final Color color;
  final bool showName;
  /// Passa um controller externo para sincronizar com outras animacoes.
  final AnimationController? externalCtrl;

  const OursMusicLogo({
    super.key,
    this.size = 48,
    this.color = kAccent,
    this.showName = true,
    this.externalCtrl,
  });

  @override
  State<OursMusicLogo> createState() => _OursMusicLogoState();
}

class _OursMusicLogoState extends State<OursMusicLogo>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  bool _ownCtrl = false;

  @override
  void initState() {
    super.initState();
    if (widget.externalCtrl != null) {
      _ctrl = widget.externalCtrl!;
    } else {
      _ownCtrl = true;
      _ctrl = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1800),
      )..repeat();
    }
  }

  @override
  void dispose() {
    if (_ownCtrl) _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final W = widget.size * 2.8;
    final H = widget.size;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedBuilder(
          animation: _ctrl,
          builder: (_, __) => CustomPaint(
            size: Size(W, H),
            painter: WavePainter(
              phase: _ctrl.value * 2 * pi,
              color: widget.color,
              strokeWidth: widget.size * 0.1,
            ),
          ),
        ),
        if (widget.showName) ...[
          SizedBox(height: widget.size * 0.25),
          Text(
            'OursMusic',
            style: TextStyle(
              color: Colors.white,
              fontSize: widget.size * 0.55,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ],
    );
  }
}

// ── SplashScreen ──────────────────────────────────────────────────────────────

class SplashScreen extends StatefulWidget {
  final VoidCallback onDone;
  const SplashScreen({super.key, required this.onDone});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _logoCtrl;
  // Unico controller para onda + barrinhas — mesma fase, sincronizados.
  late AnimationController _waveCtrl;
  late AnimationController _textCtrl;

  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;
  late Animation<double> _textOpacity;
  late Animation<double> _textSlide;

  @override
  void initState() {
    super.initState();

    _logoCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _logoScale = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _logoCtrl, curve: Curves.elasticOut),
    );
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoCtrl, curve: const Interval(0.0, 0.4)),
    );

    _waveCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();

    _textCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _textOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(_textCtrl);
    _textSlide = Tween<double>(begin: 24.0, end: 0.0).animate(
      CurvedAnimation(parent: _textCtrl, curve: Curves.easeOut),
    );

    _start();
  }

  Future<void> _start() async {
    await Future.delayed(const Duration(milliseconds: 150));
    if (!mounted) return;
    _logoCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 550));
    if (!mounted) return;
    _textCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 2800));
    if (!mounted) return;
    widget.onDone();
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _waveCtrl.dispose();
    _textCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: Center(
        child: AnimatedBuilder(
          animation: _logoCtrl,
          builder: (_, __) => Opacity(
            opacity: _logoOpacity.value,
            child: Transform.scale(
              scale: _logoScale.value,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Onda animada (logo)
                  AnimatedBuilder(
                    animation: _waveCtrl,
                    builder: (_, __) => CustomPaint(
                      size: const Size(160, 56),
                      painter: WavePainter(
                        phase: _waveCtrl.value * 2 * pi,
                        color: kAccent,
                        strokeWidth: 5.0,
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Barrinhas — mesma equacao da onda, mesma fase
                  AnimatedBuilder(
                    animation: _waveCtrl,
                    builder: (_, __) {
                      const n = 9;
                      final phase = _waveCtrl.value * 2 * pi;
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: List.generate(n, (i) {
                          // Mapeia barrinha i ao ponto x = i/(n-1) da onda
                          final t = i / (n - 1);
                          final sinVal = sin(2 * pi * t * 2.2 + phase);
                          final h = 10.0 + 26.0 * (0.5 + 0.5 * sinVal);
                          final alpha = 0.55 + 0.45 * sinVal.abs();
                          return Container(
                            width: 4,
                            height: h,
                            margin: const EdgeInsets.symmetric(horizontal: 2.5),
                            decoration: BoxDecoration(
                              color: kAccent.withValues(alpha: alpha),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          );
                        }),
                      );
                    },
                  ),

                  const SizedBox(height: 32),

                  // Nome + tagline
                  AnimatedBuilder(
                    animation: _textCtrl,
                    builder: (_, __) => Opacity(
                      opacity: _textOpacity.value,
                      child: Transform.translate(
                        offset: Offset(0, _textSlide.value),
                        child: const Column(children: [
                          Text(
                            'OursMusic',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 34,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Sua musica, do seu jeito',
                            style: TextStyle(color: kTextSecond, fontSize: 14),
                          ),
                        ]),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}