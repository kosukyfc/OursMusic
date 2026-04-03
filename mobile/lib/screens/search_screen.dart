import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import '../widgets/song_card.dart';

class SearchScreen extends StatefulWidget {
  final List<Song> songs;
  final PlayerController player;
  const SearchScreen({super.key, required this.songs, required this.player});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _ctrl = TextEditingController();
  List<Song> _results = [];

  void _search(String q) {
    if (q.trim().isEmpty) { setState(() => _results = []); return; }
    final lower = q.toLowerCase();
    setState(() => _results = widget.songs.where((s) =>
      s.title.toLowerCase().contains(lower) ||
      (s.artist?.toLowerCase().contains(lower) ?? false)
    ).toList());
  }

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          backgroundColor: kBgBase,
          title: const Text('Buscar'),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(56),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: TextField(
                controller: _ctrl,
                onChanged: _search,
                style: const TextStyle(color: kTextPrimary),
                decoration: InputDecoration(
                  hintText: 'O que você quer ouvir?',
                  hintStyle: const TextStyle(color: kTextMuted),
                  prefixIcon: const Icon(Icons.search, color: kTextMuted),
                  filled: true,
                  fillColor: const Color(0xFF2A2A2A),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(500), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ),
        ),
        if (_results.isEmpty && _ctrl.text.isEmpty)
          SliverFillRemaining(
            child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.search, size: 64, color: kTextMuted),
              const SizedBox(height: 16),
              Text('Busque por músicas ou artistas', style: Theme.of(context).textTheme.bodyMedium),
            ])),
          )
        else if (_results.isEmpty)
          SliverFillRemaining(
            child: Center(child: Text('Nenhum resultado para "${_ctrl.text}"', style: Theme.of(context).textTheme.bodyMedium)),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverGrid(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) => SongCard(song: _results[i], onTap: () => widget.player.play(_results[i], _results)),
                childCount: _results.length,
              ),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2, childAspectRatio: 0.75, crossAxisSpacing: 12, mainAxisSpacing: 12,
              ),
            ),
          ),
        const SliverPadding(padding: EdgeInsets.only(bottom: 160)),
      ],
    );
  }
}
