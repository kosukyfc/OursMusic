import 'package:flutter/material.dart';
import '../hooks/use_smart_queue.dart';
import 'package:provider/provider.dart';

class SmartQueueWidget extends StatelessWidget {
  const SmartQueueWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<SmartQueueController>(
      builder: (context, queue, _) => Column(
        children: [
          const Text('Smart Queue - Próximas Músicas'),
          const SizedBox(height: 12),
          ...['happy', 'sad', 'energetic', 'chill'].map((mood) =>
              ElevatedButton(
                onPressed: () => queue.setMood(mood),
                style: ButtonStyle(
                  backgroundColor: MaterialStateProperty.all(
                    queue.currentMood == mood ? Colors.purple : Colors.grey,
                  ),
                ),
                child: Text(mood),
              )
          ).toList(),
          const SizedBox(height: 16),
          Text('Próxima: ${queue.getNextSong()}'),
          ...queue.suggestions.map((s) => 
            ListTile(
              title: Text(s['title']),
              subtitle: Text(s['genre']),
              trailing: Text('${(s['score'] * 100).toStringAsFixed(0)}%'),
            )
          ).toList(),
        ],
      ),
    );
  }
}
