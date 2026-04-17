import 'dart:async';
import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import '../widgets/song_card.dart';
import 'user_profile_screen.dart';

class SearchScreen extends StatefulWidget {
  final List<Song> songs;
  final PlayerController player;
  const SearchScreen({super.key, required this.songs, required this.player});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _ctrl = TextEditingController();
  List<Song> _songs = [];
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _albums = [];
  bool _searching = false;
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  void _onChanged(String q) {
    _debounce?.cancel();
    if (q.trim().isEmpty) {
      setState(() { _songs = []; _users = []; _albums = []; _searching = false; });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () => _search(q.trim()));
  }

  Future<void> _search(String q) async {
    if (!mounted) return;
    setState(() => _searching = true);
    try {
      final data = await Api.get('/search?q=${Uri.encodeComponent(q)}');
      if (!mounted) return;
      if (data is Map) {
        setState(() {
          _songs = (data['songs'] as List? ?? [])
              .whereType<Map<String, dynamic>>()
              .map(Song.fromJson)
              .toList();
          _users = (data['users'] as List? ?? [])
              .whereType<Map<String, dynamic>>()
              .toList();
          _albums = (data['albums'] as List? ?? [])
              .whereType<Map<String, dynamic>>()
              .toList();
          _searching = false;
        });
      } else {
        // Fallback local
        final lower = q.toLowerCase();
        setState(() {
          _songs = widget.songs.where((s) =>
            s.title.toLowerCase().contains(lower) ||
            (s.artist?.toLowerCase().contains(lower) ?? false)
          ).toList();
          _users = [];
          _albums = [];
          _searching = false;
        });
      }
    } catch (_) {
      if (!mounted) return;
      final lower = q.toLowerCase();
      setState(() {
        _songs = widget.songs.where((s) =>
          s.title.toLowerCase().contains(lower) ||
          (s.artist?.toLowerCase().contains(lower) ?? false)
        ).toList();
        _users = [];
        _albums = [];
        _searching = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEmpty = _ctrl.text.isEmpty;
    final hasResults = _songs.isNotEmpty || _users.isNotEmpty || _albums.isNotEmpty;

    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          backgroundColor: kBgBase,
          automaticallyImplyLeading: false,
          title: const Text('Buscar', style: TextStyle(color: kTextPrimary, fontSize: 22, fontWeight: FontWeight.w900)),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(56),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: TextField(
                controller: _ctrl,
                onChanged: _onChanged,
                style: const TextStyle(color: kTextPrimary),
                decoration: InputDecoration(
                  hintText: 'Músicas, artistas, álbuns, usuários...',
                  hintStyle: const TextStyle(color: kTextMuted),
                  prefixIcon: const Icon(Icons.search, color: kTextMuted),
                  suffixIcon: _ctrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: kTextMuted, size: 18),
                        onPressed: () { _ctrl.clear(); setState(() { _songs = []; _users = []; _albums = []; _searching = false; }); },
                      )
                    : null,
                  filled: true,
                  fillColor: const Color(0xFF2A2A2A),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(500), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ),
        ),

        if (_searching)
          const SliverFillRemaining(child: Center(child: CircularProgressIndicator(color: kAccent)))
        else if (isEmpty)
          SliverFillRemaining(
            child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.search, size: 64, color: kTextMuted),
              const SizedBox(height: 16),
              Text('Busque por músicas, artistas ou usuários', style: Theme.of(context).textTheme.bodyMedium),
            ])),
          )
        else if (!hasResults)
          SliverFillRemaining(
            child: Center(child: Text('Nenhum resultado para "${_ctrl.text}"',
              style: Theme.of(context).textTheme.bodyMedium)),
          )
        else
          SliverList(
            delegate: SliverChildListDelegate([
              // ── Usuários ──────────────────────────────────────────────────
              if (_users.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text('Usuários', style: TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
                ),
                ..._users.map((u) => ListTile(
                  leading: CircleAvatar(
                    radius: 22,
                    backgroundColor: const Color(0xFF2A2A2A),
                    backgroundImage: u['avatarUrl'] != null ? NetworkImage(u['avatarUrl']) : null,
                    child: u['avatarUrl'] == null
                      ? Text((u['name'] ?? u['username'] ?? '?')[0].toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))
                      : null,
                  ),
                  title: Text(u['name'] ?? u['username'] ?? '?',
                    style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600)),
                  subtitle: u['username'] != null
                    ? Text('@${u['username']}', style: const TextStyle(color: kTextMuted, fontSize: 12))
                    : null,
                  trailing: const Icon(Icons.chevron_right, color: kTextMuted),
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => UserProfileScreen(userId: u['id'], player: widget.player),
                  )),
                )),
              ],

              // ── Músicas ───────────────────────────────────────────────────
              if (_songs.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text('Músicas', style: TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2, childAspectRatio: 0.75, crossAxisSpacing: 12, mainAxisSpacing: 12,
                    ),
                    itemCount: _songs.length,
                    itemBuilder: (ctx, i) => SongCard(
                      song: _songs[i],
                      onTap: () => widget.player.play(_songs[i], _songs),
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 160),
            ]),
          ),
      ],
    );
  }
}
