import 'package:flutter/material.dart';
import '../hooks/use_audio_visualizer.dart';
import 'package:provider/provider.dart';

class AudioVisualizerWidget extends StatelessWidget {
  const AudioVisualizerWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<AudioVisualizer>(
      builder: (context, viz, _) => Transform.rotate(
        angle: viz.rotation * 3.14159 / 180,
        child: Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(50),
            border: Border.all(color: Colors.purple, width: 2),
          ),
          child: Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(
                viz.bars.length,
                (i) => Container(
                  width: 3,
                  height: viz.bars[i] * 60,
                  decoration: BoxDecoration(
                    color: Colors.purple[300 + (i * 10) % 200],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
