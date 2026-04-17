import 'package:flutter/material.dart';
import '../hooks/use_music_theory.dart';
import 'package:provider/provider.dart';

class MusicTheoryWidget extends StatelessWidget {
  const MusicTheoryWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<MusicTheoryController>(
      builder: (context, theory, _) => Column(
        children: [
          const Text('Análise Musical'),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              Container(
                decoration: BoxDecoration(color: Colors.purple, borderRadius: BorderRadius.circular(8)),
                child: Center(child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('BPM', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    Text(theory.bpm.toString(), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  ],
                )),
              ),
              Container(
                decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(8)),
                child: Center(child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Chave', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    Text(theory.key, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  ],
                )),
              ),
              Container(
                decoration: BoxDecoration(color: Colors.blue, borderRadius: BorderRadius.circular(8)),
                child: Center(child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Escala', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    Text(theory.scale, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  ],
                )),
              ),
              Container(
                decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(8)),
                child: Center(child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Energia', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    Text('${(theory.energy * 100).toStringAsFixed(0)}%', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  ],
                )),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => theory.randomAnalyze(),
            child: const Text('Analisar'),
          ),
        ],
      ),
    );
  }
}
