import 'package:flutter/material.dart';
import '../hooks/use_setlist_builder.dart';
import 'package:provider/provider.dart';

class SetlistBuilderWidget extends StatefulWidget {
  const SetlistBuilderWidget({Key? key}) : super(key: key);

  @override
  State<SetlistBuilderWidget> createState() => _SetlistBuilderWidgetState();
}

class _SetlistBuilderWidgetState extends State<SetlistBuilderWidget> {
  final _controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Consumer<SetlistBuilder>(
      builder: (context, builder, _) => Column(
        children: [
          TextField(
            controller: _controller,
            decoration: InputDecoration(
              hintText: 'Nome da Playlist',
              suffixIcon: IconButton(
                icon: const Icon(Icons.add),
                onPressed: () {
                  if (_controller.text.isNotEmpty) {
                    builder.createSetlist(_controller.text);
                    _controller.clear();
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            itemCount: builder.setlists.length,
            itemBuilder: (context, idx) {
              final setlist = builder.setlists[idx];
              final duration = builder.getTotalDuration(setlist.id);
              
              return ListTile(
                title: Text(setlist.name),
                subtitle: Text('${setlist.songs.length} músicas • ${duration.inMinutes}min'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () => builder.deleteSetlist(setlist.id),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
