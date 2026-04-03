import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';

/// Avatar com efeitos premium (neon piscando + raios) para planos premium/family.
class PremiumAvatar extends StatefulWidget {
  final String? avatarUrl;
  final String name;
  final String plan;
  final bool playing;
  final double size;
  final VoidCallback? onTap;

  const PremiumAvatar({
    super.key,
    required this.name,
    required this.plan,
    this.avatarUrl,
    this.playing = false,
    this.size = 40,
    this.onTap,
  });

  @override
  State<PremiumAvatar> createState() => _PremiumAvatarState();
}

class _PremiumAvatarState extends State<PremiumAvatar>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _pulse;

  bool get isPremium => widget.plan == 'premium' || widget.plan == 'family';

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))
      ..repeat(reverse: true);
    _pulse = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canvasSize = widget.size + 24;

    return GestureDetector(
      onTap: widget.onTap,
      child: SizedBox(
        width: canvasSize,
        height: canvasSize,
        child: Stack(alignment: Alignment.center, children: [
          // Neon ring + lightning (premium only)
          if (isPremium)
            AnimatedBuilder(
              animation: _pulse,
              builder: (_, __) => CustomPaint(
                size: Size(canvasSize, canvasSize),
                painter: _NeonRingPainter(
                  pulse: widget.playing ? _pulse.value : 0.5,
                  playing: widget.playing,
                ),
              ),
            ),

          // Avatar circle
          AnimatedBuilder(
            animation: _pulse,
            builder: (_, __) {
              final glow = isPremium && widget.playing ? _pulse.value : 0.0;
              return Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: kAccent,
                  boxShadow: isPremium && widget.playing
                    ? [
                        BoxShadow(color: kAccent.withOpacity(0.6 * glow), blurRadius: 12 * glow, spreadRadius: 2 * glow),
                        BoxShadow(color: kAccent.withOpacity(0.3 * glow), blurRadius: 24 * glow),
                      ]
                    : null,
                ),
                clipBehavior: Clip.antiAlias,
                child: widget.avatarUrl != null
                  ? Image.network(widget.avatarUrl!, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _initials())
                  : _initials(),
              );
            },
          ),
        ]),
      ),
    );
  }

  Widget _initials() => Center(
    child: Text(
      widget.name.isNotEmpty ? widget.name[0].toUpperCase() : '?',
      style: TextStyle(
        color: Colors.black,
        fontSize: widget.size * 0.4,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

class _NeonRingPainter extends CustomPainter {
  final double pulse;
  final bool playing;
  final Random _rng = Random(42);

  _NeonRingPainter({required this.pulse, required this.playing});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width / 2 - 4;

    // Neon ring
    final ringPaint = Paint()
      ..color = kAccent.withOpacity(0.4 + pulse * 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 6 * pulse);
    canvas.drawCircle(Offset(cx, cy), r, ringPaint);

    if (!playing) return;

    // Lightning bolts
    final boltPaint = Paint()
      ..color = kAccent.withOpacity(0.7 * pulse)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final numBolts = 4;
    for (int i = 0; i < numBolts; i++) {
      final angle = (pi * 2 * i) / numBolts;
      final startX = cx + cos(angle) * r;
      final startY = cy + sin(angle) * r;
      final path = Path()..moveTo(startX, startY);
      double x = startX, y = startY;
      for (int s = 0; s < 4; s++) {
        final nx = x + cos(angle) * 5 + (_rng.nextDouble() - 0.5) * 6;
        final ny = y + sin(angle) * 5 + (_rng.nextDouble() - 0.5) * 6;
        path.lineTo(nx, ny);
        x = nx; y = ny;
      }
      canvas.drawPath(path, boltPaint);
    }
  }

  @override
  bool shouldRepaint(_NeonRingPainter old) => old.pulse != pulse || old.playing != playing;
}
