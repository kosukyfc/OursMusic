import 'package:flutter/material.dart';
import '../hooks/use_tempo_control.dart';
import 'package:provider/provider.dart';

class TempoControlPanel extends StatelessWidget {
  const TempoControlPanel({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<TempoController>(
      builder: (context, tempo, _) => Column(
        children: [
          Text('Velocidade: ${tempo.tempo.toStringAsFixed(2)}x'),
          Slider(
            value: tempo.tempo,
            min: 0.5,
            max: 2.0,
            divisions: 15,
            label: '${tempo.tempo.toStringAsFixed(2)}x',
            onChanged: tempo.setTempo,
          ),
          Wrap(
            spacing: 8,
            children: tempo.presets.map((preset) => 
              ElevatedButton(
                onPressed: () => tempo.setTempo(preset),
                child: Text('${preset}x'),
              )
            ).toList(),
          ),
          ElevatedButton(
            onPressed: tempo.reset,
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }
}
