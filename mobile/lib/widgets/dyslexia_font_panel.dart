import 'package:flutter/material.dart';
import '../hooks/use_dyslexia_font.dart';
import 'package:provider/provider.dart';

class DyslexiaFontPanel extends StatelessWidget {
  const DyslexiaFontPanel({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<DyslexiaFont>(
      builder: (context, dyslexia, _) => Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Modo Dislexia'),
              Switch(
                value: dyslexia.enabled,
                onChanged: dyslexia.toggleDyslexia,
              ),
            ],
          ),
          DropdownButton<String>(
            value: dyslexia.fontFamily,
            items: dyslexia.availableFonts
                .map((f) => DropdownMenuItem(value: f, child: Text(f)))
                .toList(),
            onChanged: (f) => dyslexia.setFont(f ?? 'Roboto'),
          ),
          DropdownButton<int>(
            value: dyslexia.contrastMode,
            items: List.generate(
              dyslexia.contrastModes.length,
              (i) => DropdownMenuItem(
                value: i,
                child: Text(dyslexia.contrastModes[i]),
              ),
            ),
            onChanged: (m) => dyslexia.setContrastMode(m ?? 0),
          ),
          Slider(
            value: dyslexia.fontSize,
            min: 12,
            max: 24,
            divisions: 12,
            label: '${dyslexia.fontSize.toStringAsFixed(0)}',
            onChanged: dyslexia.setFontSize,
          ),
        ],
      ),
    );
  }
}
