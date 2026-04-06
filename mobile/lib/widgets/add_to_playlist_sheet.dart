import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';

/// Bottom sheet to add a song to an existing playlist or create a new one.
class AddToPlaylistSheet extends StatefulWidget {
  final String songId;
  const AddToPlaylistSheet({super.key, required this.songId});

  @override
  State<AddToPlaylistSheet> createState() => _AddToPlaylistSheetState();
}

class _AddToPlaylistSheetState extends State<AddToPlaylistSheet> {
  List<Playlist> _playlists = [];
  bool _loading = true;
  String? _adding;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await Api.get('/playlists');
      if (data is List && mounted) {
        setState(() {
          _playlists = data
              .whereType<Map<String, dynamic>>()
              .map(Playlist.fromJson)
              .toList();
          _loading = false;
        });
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addToPlaylist(Playlist pl) async {
    setState(() => _adding = pl.id);
    try {
      await Api.post('/playlists/${pl.id}/songs', {'songId': widget.songId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Adicionado a "${pl.title}"'),
              backgroundColor: kAccent),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
        setState(() => _adding = null);
      }
    }
  }

  Future<void> _createAndAdd() async {
    final ctrl = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF282828),
        title:
            const Text('Nova playlist', style: TextStyle(color: kTextPrimary)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          style: const TextStyle(color: kTextPrimary),
          decoration: InputDecoration(
            hintText: 'Nome da playlist',
            hintStyle: const TextStyle(color: kTextMuted),
            filled: true,
            fillColor: const Color(0xFF3A3A3A),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child:
                  const Text('Cancelar', style: TextStyle(color: kTextMuted))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, ctrl.text.trim()),
            style: ElevatedButton.styleFrom(
                backgroundColor: kAccent, foregroundColor: Colors.black),
            child: const Text('Criar'),
          ),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;
    try {
      final data =
          await Api.post('/playlists', {'title': name, 'isPublic': false});
      if (data is Map<String, dynamic>) {
        final pl = Playlist.fromJson(data);
        await _addToPlaylist(pl);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF282828),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // Handle
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 8),
            child: Center(
                child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: const Color(0xFF535353),
                  borderRadius: BorderRadius.circular(2)),
            )),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 4, 20, 12),
            child: Text('Adicionar à playlist',
                style: TextStyle(
                    color: kTextPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800)),
          ),

          // Create new
          ListTile(
            leading: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: const Color(0xFF3A3A3A),
                  borderRadius: BorderRadius.circular(4)),
              child: const Icon(Icons.add, color: kTextPrimary),
            ),
            title: const Text('Nova playlist',
                style: TextStyle(
                    color: kTextPrimary, fontWeight: FontWeight.w600)),
            onTap: _createAndAdd,
          ),

          const Divider(color: Color(0xFF3A3A3A), height: 1),

          if (_loading)
            const Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(color: kAccent))
          else if (_playlists.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('Nenhuma playlist ainda',
                  style: TextStyle(color: kTextMuted)),
            )
          else
            ConstrainedBox(
              constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.4),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _playlists.length,
                itemBuilder: (ctx, i) {
                  final pl = _playlists[i];
                  final isAdding = _adding == pl.id;
                  return ListTile(
                    leading: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: kAccent.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Icon(Icons.queue_music,
                          color: kAccent, size: 22),
                    ),
                    title: Text(pl.title,
                        style: const TextStyle(
                            color: kTextPrimary, fontWeight: FontWeight.w600)),
                    subtitle: Text('${pl.songs.length} músicas',
                        style:
                            const TextStyle(color: kTextMuted, fontSize: 12)),
                    trailing: isAdding
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: kAccent, strokeWidth: 2))
                        : null,
                    onTap: isAdding ? null : () => _addToPlaylist(pl),
                  );
                },
              ),
            ),

          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}
