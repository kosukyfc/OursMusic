import 'package:flutter/material.dart';
import '../hooks/use_font_size_adjuster.dart';
import 'package:provider/provider.dart';

class FontSizePanel extends StatelessWidget {
  const FontSizePanel({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<FontSizeAdjuster>(
      builder: (context, adjuster, _) => Column(
        children: [
          const Text('Tamanho da Fonte'),
          Slider(
            value: adjuster.fontSize,
            min: 12,
            max: 28,
            divisions: 16,
            label: '${adjuster.fontSize.toStringAsFixed(0)}',
            onChanged: adjuster.setFontSize,
          ),
          Wrap(
            spacing: 8,
            children: adjuster.presets.entries.map((e) =>
              ElevatedButton(
                onPressed: () => adjuster.applyPreset(e.key),
                child: Text(e.key),
              )
            ).toList(),
          ),
          const SizedBox(height: 12),
          const Text('Altura da Linha'),
          Slider(
            value: adjuster.lineHeight,
            min: 1.0,
            max: 2.5,
            divisions: 15,
            label: adjuster.lineHeight.toStringAsFixed(1),
            onChanged: adjuster.setLineHeight,
          ),
        ],
      ),
    );
  }
}
