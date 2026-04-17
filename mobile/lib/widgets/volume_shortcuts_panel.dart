import 'package:flutter/material.dart';
import '../hooks/use_volume_shortcuts.dart';
import 'package:provider/provider.dart';

class VolumeShortcutsPanel extends StatelessWidget {
  const VolumeShortcutsPanel({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<VolumeShortcuts>(
      builder: (context, shortcuts, _) => Column(
        children: [
          const Text('Atalhos de Volume'),
          Slider(
            value: shortcuts.volume,
            min: 0,
            max: 1,
            divisions: 10,
            label: '${(shortcuts.volume * 100).toStringAsFixed(0)}%',
            onChanged: (_) {}, // Controlado por volume buttons
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              IconButton(
                icon: const Icon(Icons.volume_down),
                onPressed: shortcuts.decreaseVolume,
              ),
              IconButton(
                icon: const Icon(Icons.volume_off),
                onPressed: shortcuts.toggleMute,
              ),
              IconButton(
                icon: const Icon(Icons.volume_up),
                onPressed: shortcuts.increaseVolume,
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Gestos Suportados:'),
          ...VolumeShortcuts().supportedGestures
              .map((g) => Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Text('• $g', style: const TextStyle(fontSize: 12)),
                  ))
              .toList(),
        ],
      ),
    );
  }
}
