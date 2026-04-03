import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';

/// Shown after first registration — user picks favorite artists/genres.
/// Based on selections, the home feed is personalized.
class OnboardingScreen extends StatefulWidget {
  final VoidCallback onDone;
  const OnboardingScreen({super.key, required this.onDone});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final Set<String> _selected = {};
  int _step = 0; // 0 = genres, 1 = artists
  bool _loading = false;

  static const _genres = [
    {'name': 'Pop', 'color': 0xFFE8115B},
    {'name': 'Hip-Hop', 'color': 0xFF7358FF},
    {'name': 'Rock', 'color': 0xFFE13300},
    {'name': 'Sertanejo', 'color': 0xFF148A08},
    {'name': 'Funk', 'color': 0xFFB02897},
    {'name': 'Eletronica', 'color': 0xFF1E3264},
    {'name': 'R&B', 'color': 0xFF477D95},
    {'name': 'Pagode', 'color': 0xFF8C1932},
    {'name': 'Forró', 'color': 0xFFE91429},
    {'name': 'MPB', 'color': 0xFF503750},
    {'name': 'Gospel', 'color': 0xFF8D67AB},
    {'name': 'Indie', 'color': 0xFF1DB954},
  ];

  static const _artists = [
    {'name': 'Natanzinho Lima', 'color': 0xFF1E3264},
    {'name': 'Gusttavo Lima', 'color': 0xFF7358FF},
    {'name': 'Wesley Safadão', 'color': 0xFFE8115B},
    {'name': 'Marilia Mendonca', 'color': 0xFF8C1932},
    {'name': 'Anitta', 'color': 0xFFB02897},
    {'name': 'MC Cabelinho', 'color': 0xFF148A08},
    {'name': 'Ludmilla', 'color': 0xFFE13300},
    {'name': 'Zé Neto & Cristiano', 'color': 0xFF477D95},
    {'name': 'Henrique & Juliano', 'color': 0xFF503750},
    {'name': 'Luan Santana', 'color': 0xFF1DB954},
    {'name': 'Ivete Sangalo', 'color': 0xFFE91429},
    {'name': 'Thiaguinho', 'color': 0xFF8D67AB},
  ];

  List<Map<String, dynamic>> get _current =>
      (_step == 0 ? _genres : _artists).cast<Map<String, dynamic>>();

  String get _title => _step == 0
      ? 'Escolha seus generos favoritos'
      : 'Escolha seus artistas favoritos';

  String get _subtitle => _step == 0
      ? 'Selecione pelo menos 3 para continuar'
      : 'Quanto mais voce escolher, melhor a recomendacao';

  bool get _canContinue => _selected.length >= 3;

  void _toggle(String name) {
    setState(() {
      if (_selected.contains(name)) _selected.remove(name);
      else _selected.add(name);
    });
  }

  Future<void> _next() async {
    if (_step == 0) {
      setState(() { _step = 1; _selected.clear(); });
      return;
    }
    // Save preferences and go to home
    setState(() => _loading = true);
    try {
      await Api.post('/social/profile', {'bio': 'Gosta de: ${_selected.join(', ')}'});
    } catch (_) {}
    if (mounted) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgBase,
      body: SafeArea(
        child: Column(children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Progress dots
              Row(children: List.generate(2, (i) => Container(
                width: i == _step ? 24 : 8, height: 8,
                margin: const EdgeInsets.only(right: 6),
                decoration: BoxDecoration(
                  color: i == _step ? kAccent : const Color(0xFF3A3A3A),
                  borderRadius: BorderRadius.circular(4),
                ),
              ))),
              const SizedBox(height: 20),
              Text(_title, style: const TextStyle(color: kTextPrimary, fontSize: 26, fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              Text(_subtitle, style: const TextStyle(color: kTextSecond, fontSize: 14)),
              const SizedBox(height: 4),
              Text('${_selected.length} selecionados', style: TextStyle(
                color: _canContinue ? kAccent : kTextMuted, fontSize: 12, fontWeight: FontWeight.w700)),
            ]),
          ),

          // Grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2, childAspectRatio: 1.6,
                crossAxisSpacing: 10, mainAxisSpacing: 10,
              ),
              itemCount: _current.length,
              itemBuilder: (ctx, i) {
                final item = _current[i];
                final name = item['name'] as String;
                final color = Color(item['color'] as int);
                final selected = _selected.contains(name);
                return GestureDetector(
                  onTap: () => _toggle(name),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(10),
                      border: selected ? Border.all(color: Colors.white, width: 3) : null,
                      boxShadow: selected ? [BoxShadow(color: color.withOpacity(0.5), blurRadius: 12, spreadRadius: 2)] : null,
                    ),
                    child: Stack(children: [
                      Positioned(bottom: 12, left: 12,
                        child: Text(name, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800))),
                      if (selected)
                        Positioned(top: 8, right: 8,
                          child: Container(
                            width: 24, height: 24,
                            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                            child: const Icon(Icons.check, color: Colors.black, size: 16),
                          ),
                        ),
                    ]),
                  ),
                );
              },
            ),
          ),

          // Continue button
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _canContinue && !_loading ? _next : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kAccent,
                  foregroundColor: Colors.black,
                  disabledBackgroundColor: const Color(0xFF2A2A2A),
                  disabledForegroundColor: kTextMuted,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
                ),
                child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                  : Text(_step == 0 ? 'Continuar' : 'Comecar a ouvir',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}
