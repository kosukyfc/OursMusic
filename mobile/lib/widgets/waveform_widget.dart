import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../api.dart';
import '../player/player_controller.dart';

/// Waveform animado sincronizado com as batidas da música atual.
///
/// Busca os dados de análise do backend (/songs/:id/analysis) e anima
/// as barras do waveform pulsando nos timestamps das batidas.
class WaveformWidget extends StatefulWidget {
  final PlayerController player;
  final double height;
  final Color? color;

  const WaveformWidget({
    super.key,
    required this.player,
    this.height = 64,
    this.color,
  });

  @override
  State<WaveformWidget> createState() => _WaveformWidgetState();
}

class _WaveformWidgetState extends State<WaveformWidget>
    with TickerProviderStateMixin {
  List<double> _waveform = [];
  List<int> _beatMs = [];
  String? _loadedSongId;
  bool _loading = false;

  late AnimationController _beatController;
  late Animation<double> _beatAnim;

  // Índice da última batida processada
  int _lastBeatIdx = 0;

  @override
  void initState() {
    super.initState();
    _beatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 180),
    );
    _beatAnim = Tween<double>(begin: 1.0, end: 1.35).animate(
      CurvedAnimation(parent: _beatController, curve: Curves.easeOut),
    );
    widget.player.addListener(_onPlayerChanged);
    _onPlayerChanged();
  }

  @override
  void dispose() {
    widget.player.removeListener(_onPlayerChanged);
    _beatController.dispose();
    super.dispose();
  }

  void _onPlayerChanged() {
    final song = widget.player.current;
    if (song == null) return;

    // Carrega análise quando a música muda
    if (song.id != _loadedSongId) {
      _loadedSongId = song.id;
      _lastBeatIdx = 0;
      _loadAnalysis(song.id);
    }

    // Verifica se chegou numa batida
    if (_beatMs.isNotEmpty) {
      final posMs = widget.player.position.inMilliseconds;
      // Avança o índice enquanto a posição ultrapassar a próxima batida
      while (_lastBeatIdx < _beatMs.length - 1 &&
          posMs >= _beatMs[_lastBeatIdx]) {
        _lastBeatIdx++;
        _triggerBeat();
      }
    }
  }

  void _triggerBeat() {
    if (!mounted) return;
    _beatController.forward(from: 0).then((_) {
      if (mounted) _beatController.reverse();
    });
  }

  Future<void> _loadAnalysis(String songId) async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final data = await Api.get('/songs/$songId/analysis');
      if (!mounted) return;
      final beats = (data['beatTimestamps'] as List?)
              ?.map((e) => (e as num).toInt())
              .toList() ??
          [];
      final waveform = (data['waveformData'] as List?)
              ?.map((e) => (e as num).toDouble())
              .toList() ??
          [];
      setState(() {
        _beatMs = beats;
        _waveform = waveform.isEmpty ? _defaultWaveform() : waveform;
        _loading = false;
        _lastBeatIdx = 0;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _waveform = _defaultWaveform();
          _loading = false;
        });
      }
    }
  }

  List<double> _defaultWaveform() {
    return List.generate(
        200, (i) => 0.3 + 0.7 * (0.5 + 0.5 * math.sin(i * 0.15)).abs());
  }

  @override
  Widget build(BuildContext context) {
    if (widget.player.current == null) return const SizedBox.shrink();

    final color = widget.color ?? const Color(0xFF7C3AED);
    final progress = widget.player.progress;

    return AnimatedBuilder(
      animation: Listenable.merge([_beatController, widget.player]),
      builder: (context, _) {
        return SizedBox(
          height: widget.height,
          child: CustomPaint(
            painter: _WaveformPainter(
              waveform: _waveform.isEmpty ? _defaultWaveform() : _waveform,
              progress: progress,
              beatScale: _beatAnim.value,
              color: color,
            ),
            size: Size.infinite,
          ),
        );
      },
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final List<double> waveform;
  final double progress;
  final double beatScale;
  final Color color;

  _WaveformPainter({
    required this.waveform,
    required this.progress,
    required this.beatScale,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (waveform.isEmpty) return;

    final barCount = math.min(waveform.length, 80);
    final barWidth = size.width / barCount;
    final gap = barWidth * 0.25;
    final bw = barWidth - gap;
    final progressX = size.width * progress;

    for (int i = 0; i < barCount; i++) {
      // Downsample waveform to barCount
      final sampleIdx = (i / barCount * waveform.length).floor()
          .clamp(0, waveform.length - 1);
      final amp = waveform[sampleIdx];

      final x = i * barWidth + gap / 2;
      final barH = (amp * size.height * 0.85 * beatScale).clamp(2.0, size.height);
      final top = (size.height - barH) / 2;

      final isPlayed = x < progressX;
      final paint = Paint()
        ..style = PaintingStyle.fill
        ..color = isPlayed
            ? color.withValues(alpha: 0.9)
            : color.withValues(alpha: 0.28);

      // Glow nas barras já tocadas
      if (isPlayed && amp > 0.6) {
        final glowPaint = Paint()
          ..style = PaintingStyle.fill
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3)
          ..color = color.withValues(alpha: 0.35);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x - 1, top - 1, bw + 2, barH + 2),
            const Radius.circular(2),
          ),
          glowPaint,
        );
      }

      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, top, bw, barH),
          const Radius.circular(2),
        ),
        paint,
      );
    }

    // Linha de progresso
    final linePaint = Paint()
      ..color = color.withValues(alpha: 0.7)
      ..strokeWidth = 1.5;
    canvas.drawLine(
      Offset(progressX, 0),
      Offset(progressX, size.height),
      linePaint,
    );
  }

  @override
  bool shouldRepaint(_WaveformPainter old) =>
      old.progress != progress ||
      old.beatScale != beatScale ||
      old.waveform != waveform;
}
