import 'package:flutter/material.dart';
import '../hooks/use_listening_heatmap.dart';
import 'package:provider/provider.dart';

class ListeningHeatmapWidget extends StatelessWidget {
  const ListeningHeatmapWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<ListeningHeatmapController>(
      builder: (context, heatmap, _) => Column(
        children: [
          const Text('Seu Hábito de Escuta (7 dias x 24h)'),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1,
            ),
            itemCount: 168,
            itemBuilder: (context, index) {
              final day = index ~/ 24;
              final hour = index % 24;
              final intensity = heatmap.getIntensity(day, hour);
              
              return Container(
                margin: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: Color.lerp(
                    Colors.grey[300],
                    Colors.purple[900],
                    intensity,
                  ),
                  borderRadius: BorderRadius.circular(4),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
