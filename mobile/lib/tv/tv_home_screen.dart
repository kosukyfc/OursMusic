import 'dart:async';
import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import '../services/favorites_service.dart';
import '../widgets/add_to_playlist_sheet.dart';
import 'tv_player_bar.dart';

/// TV/TV Box home — 3-column layout like Spotify desktop.
/// Left: sidebar, Center: content, Right: now playing panel.
class TvHomeScreen extends StatefulWidget {
  final VoidCallback onLogout;
  const TvHomeScreen({super.key, required this.onLogout});
  @override
  State<TvHomeScreen> createState() => _TvHomeScreenState();
}

class _TvHomeScreenState extends State<TvHomeScreen> {
  List<Song> _songs = [];
  bool _loading = true;
  int _sidebarIdx = 0;
  final _player = PlayerController();
  final _searchCtrl = TextEditingController();
  List<Song> _searchResults = [];
  bool _searching = false;
  Timer? _searchDebounce;
  List<Playlist> _playlists = [];

  final _sidebarItems = const [
    {'icon': Icons.home, 'label': 'Início'},
    {'icon': Icons.search, 'label': 'Buscar'},
    {'icon': Icons.library_music, 'label': 'Sua Biblioteca'},
  ];

  @override
  void initState() {
    super.initState();
    _loadSongs();
    _loadPlaylists();
    favoritesService.load();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchCtrl.dispose();
    _player.dispose();
    super.dispose();
  }

  Future<void> _loadPlaylists() async {
    try {
      final data = await Api.get('/playlists');
      if (data is List && mounted) {
        setState(() => _playlists = data
            .whereType<Map<String, dynamic>>()
            .map(Playlist.fromJson)
            .toList());
      }
    } catch (_) {}
  }

  Future<void> _loadSongs() async {
    try {
      final data = await Api.get('/songs');
      if (data is List && mounted) {
        setState(() {
          _songs = data
              .whereType<Map<String, dynamic>>()
              .map((j) => Song.fromJson(j))
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

  void _search(String q) {
    _searchDebounce?.cancel();
    if (q.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _searching = false;
      });
      return;
    }
    _searchDebounce =
        Timer(const Duration(milliseconds: 400), () => _doSearch(q.trim()));
  }

  Future<void> _doSearch(String q) async {
    if (!mounted) return;
    setState(() => _searching = true);
    try {
      final data = await Api.get('/search?q=${Uri.encodeComponent(q)}');
      if (!mounted) return;
      List<Song> results = [];
      if (data is List) {
        results =
            data.whereType<Map<String, dynamic>>().map(Song.fromJson).toList();
      } else if (data is Map && data['songs'] is List) {
        results = (data['songs'] as List)
            .whereType<Map<String, dynamic>>()
            .map(Song.fromJson)
            .toList();
      } else {
        final lower = q.toLowerCase();
        results = _songs
            .where((s) =>
                s.title.toLowerCase().contains(lower) ||
                (s.artist?.toLowerCase().contains(lower) ?? false))
            .toList();
      }
      setState(() {
        _searchResults = results;
        _searching = false;
      });
    } catch (_) {
      if (!mounted) return;
      final lower = q.toLowerCase();
      setState(() {
        _searchResults = _songs
            .where((s) =>
                s.title.toLowerCase().contains(lower) ||
                (s.artist?.toLowerCase().contains(lower) ?? false))
            .toList();
        _searching = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgBase,
      body: Column(children: [
        // ── Top bar ──────────────────────────────────────────────────────
        _TvTopBar(
            onSearch: _search, ctrl: _searchCtrl, onLogout: widget.onLogout),

        // ── Body ─────────────────────────────────────────────────────────
        Expanded(
            child: Row(children: [
          // Sidebar
          _TvSidebar(
              items: _sidebarItems,
              selected: _sidebarIdx,
              onSelect: (i) => setState(() => _sidebarIdx = i),
              playlists: _playlists),

          // Main content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: kAccent))
                : _sidebarIdx == 1
                    ? _TvSearchContent(
                        results:
                            _searchResults.isEmpty && _searchCtrl.text.isEmpty
                                ? _songs
                                : _searchResults,
                        player: _player,
                        searching: _searching)
                    : _TvMainContent(songs: _songs, player: _player),
          ),

          // Right panel — now playing
          ListenableBuilder(
            listenable: _player,
            builder: (_, __) => _player.current != null
                ? _TvNowPlayingPanel(player: _player)
                : const SizedBox(width: 280, child: _TvRightPlaceholder()),
          ),
        ])),

        // ── Player bar ───────────────────────────────────────────────────
        ListenableBuilder(
          listenable: _player,
          builder: (_, __) => TvPlayerBar(player: _player),
        ),
      ]),
    );
  }
}

// ── Top bar ───────────────────────────────────────────────────────────────────
class _TvTopBar extends StatelessWidget {
  final ValueChanged<String> onSearch;
  final TextEditingController ctrl;
  final VoidCallback onLogout;
  const _TvTopBar(
      {required this.onSearch, required this.ctrl, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      color: const Color(0xFF0A0A0A),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(children: [
        const Icon(Icons.music_note, color: kAccent, size: 32),
        const SizedBox(width: 32),
        // Nav buttons
        _NavBtn(icon: Icons.arrow_back_ios, onTap: () {}),
        const SizedBox(width: 8),
        _NavBtn(icon: Icons.arrow_forward_ios, onTap: () {}),
        const SizedBox(width: 24),
        // Search
        Expanded(
            child: Container(
          height: 40,
          decoration: BoxDecoration(
              color: const Color(0xFF2A2A2A),
              borderRadius: BorderRadius.circular(20)),
          child: TextField(
            controller: ctrl,
            onChanged: onSearch,
            style: const TextStyle(color: kTextPrimary, fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'O que você quer ouvir?',
              hintStyle: TextStyle(color: kTextMuted),
              prefixIcon: Icon(Icons.search, color: kTextMuted, size: 20),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        )),
        const SizedBox(width: 24),
        // Right actions
        TextButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.download, color: kTextPrimary, size: 18),
          label: const Text('Instalar aplicativo',
              style: TextStyle(color: kTextPrimary, fontSize: 13)),
        ),
        IconButton(
            icon: const Icon(Icons.notifications_outlined, color: kTextPrimary),
            onPressed: () {}),
        IconButton(
            icon: const Icon(Icons.people_outline, color: kTextPrimary),
            onPressed: () {}),
        GestureDetector(
          onTap: () => _showMenu(context),
          child: Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
                color: Color(0xFF535353), shape: BoxShape.circle),
            child: const Icon(Icons.person, color: kTextPrimary, size: 18),
          ),
        ),
      ]),
    );
  }

  void _showMenu(BuildContext context) {
    showMenu(
      context: context,
      position: const RelativeRect.fromLTRB(900, 64, 24, 0),
      color: const Color(0xFF282828),
      items: [
        PopupMenuItem(
            onTap: onLogout,
            child: const Text('Sair', style: TextStyle(color: kTextPrimary))),
      ],
    );
  }
}

class _NavBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _NavBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
              color: Color(0xFF2A2A2A), shape: BoxShape.circle),
          child: Icon(icon, color: kTextPrimary, size: 14),
        ),
      );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
class _TvSidebar extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final int selected;
  final ValueChanged<int> onSelect;
  final List<Playlist> playlists;
  const _TvSidebar(
      {required this.items,
      required this.selected,
      required this.onSelect,
      required this.playlists});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      color: const Color(0xFF0A0A0A),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 16),
        ...List.generate(items.length, (i) {
          final item = items[i];
          final active = i == selected;
          return ListTile(
            leading: Icon(item['icon'] as IconData,
                color: active ? kTextPrimary : kTextMuted, size: 22),
            title: Text(item['label'] as String,
                style: TextStyle(
                    color: active ? kTextPrimary : kTextMuted,
                    fontSize: 14,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w400)),
            onTap: () => onSelect(i),
          );
        }),
        const Divider(color: Color(0xFF2A2A2A), height: 32),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child:
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Sua Biblioteca',
                style: TextStyle(
                    color: kTextPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w700)),
            Icon(Icons.add, color: kTextPrimary, size: 20),
          ]),
        ),
        if (playlists.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const SizedBox(height: 16),
              const Text('Crie sua primeira playlist',
                  style: TextStyle(
                      color: kTextPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              const Text('É fácil, vamos te ajudar.',
                  style: TextStyle(color: kTextSecond, fontSize: 12)),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                    foregroundColor: kTextPrimary,
                    side: const BorderSide(color: kTextPrimary),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20))),
                child: const Text('Criar playlist',
                    style:
                        TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              ),
            ]),
          )
        else
          Expanded(
              child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 4),
            itemCount: playlists.length,
            itemBuilder: (ctx, i) => ListTile(
              dense: true,
              leading: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                    color: kAccent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(4)),
                child: const Icon(Icons.queue_music, color: kAccent, size: 18),
              ),
              title: Text(playlists[i].title,
                  style: const TextStyle(color: kTextPrimary, fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              subtitle: Text('${playlists[i].songs.length} músicas',
                  style: const TextStyle(color: kTextMuted, fontSize: 11)),
              onTap: () {},
            ),
          )),
      ]),
    );
  }
}

// ── Main content ──────────────────────────────────────────────────────────────
class _TvMainContent extends StatelessWidget {
  final List<Song> songs;
  final PlayerController player;
  const _TvMainContent({required this.songs, required this.player});

  @override
  Widget build(BuildContext context) {
    final featured = songs.take(8).toList();
    final recents = songs.take(6).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Filter chips
        const Row(children: [
          _TvChip(label: 'Tudo', selected: true),
          SizedBox(width: 8),
          _TvChip(label: 'Música'),
          SizedBox(width: 8),
          _TvChip(label: 'Podcasts'),
        ]),
        const SizedBox(height: 28),

        // Section: Estações populares
        _SectionHeader(title: 'Estações de rádio populares', onShowAll: () {}),
        const SizedBox(height: 16),
        SizedBox(
            height: 220,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: featured.length,
              itemBuilder: (ctx, i) => _TvAlbumCard(
                  song: featured[i],
                  onTap: () => player.play(featured[i], songs)),
            )),
        const SizedBox(height: 32),

        // Section: Recents
        _SectionHeader(title: 'Por onde começar', onShowAll: () {}),
        const SizedBox(height: 16),
        SizedBox(
            height: 200,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: recents.length,
              itemBuilder: (ctx, i) => _TvAlbumCard(
                  song: recents[i],
                  onTap: () => player.play(recents[i], songs)),
            )),
      ]),
    );
  }
}

class _TvChip extends StatelessWidget {
  final String label;
  final bool selected;
  const _TvChip({required this.label, this.selected = false});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? kTextPrimary : const Color(0xFF2A2A2A),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label,
            style: TextStyle(
                color: selected ? Colors.black : kTextPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w600)),
      );
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback onShowAll;
  const _SectionHeader({required this.title, required this.onShowAll});
  @override
  Widget build(BuildContext context) =>
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(title,
            style: const TextStyle(
                color: kTextPrimary,
                fontSize: 22,
                fontWeight: FontWeight.w800)),
        TextButton(
            onPressed: onShowAll,
            child: const Text('Mostrar tudo',
                style: TextStyle(
                    color: kTextSecond,
                    fontSize: 13,
                    fontWeight: FontWeight.w700))),
      ]);
}

class _TvAlbumCard extends StatelessWidget {
  final Song song;
  final VoidCallback onTap;
  const _TvAlbumCard({required this.song, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          width: 180,
          margin: const EdgeInsets.only(right: 16),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: song.coverUrl != null
                  ? Image.network(song.coverUrl!,
                      width: 180,
                      height: 180,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
            ),
            const SizedBox(height: 8),
            Text(song.title,
                style: const TextStyle(
                    color: kTextPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w600),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            Text(song.artist ?? 'Artista desconhecido',
                style: const TextStyle(color: kTextSecond, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ]),
        ),
      );
  Widget _placeholder() => Container(
      width: 180,
      height: 180,
      color: const Color(0xFF2A2A2A),
      child: const Icon(Icons.music_note, color: kTextMuted, size: 48));
}

// ── Search content ────────────────────────────────────────────────────────────
class _TvSearchContent extends StatelessWidget {
  final List<Song> results;
  final PlayerController player;
  final bool searching;
  const _TvSearchContent(
      {required this.results, required this.player, this.searching = false});
  @override
  Widget build(BuildContext context) {
    if (searching) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    if (results.isEmpty) {
      return const Center(
          child: Text('Nenhum resultado', style: TextStyle(color: kTextMuted)));
    }
    return GridView.builder(
      padding: const EdgeInsets.all(24),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        childAspectRatio: 0.75,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: results.length,
      itemBuilder: (ctx, i) => _TvAlbumCard(
          song: results[i], onTap: () => player.play(results[i], results)),
    );
  }
}

// ── Right panel — now playing ─────────────────────────────────────────────────
class _TvNowPlayingPanel extends StatelessWidget {
  final PlayerController player;
  const _TvNowPlayingPanel({required this.player});
  @override
  Widget build(BuildContext context) {
    final song = player.current!;
    return Container(
      width: 280,
      color: const Color(0xFF0A0A0A),
      child: Column(children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child:
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            IconButton(
                icon: const Icon(Icons.picture_in_picture_alt,
                    color: kTextPrimary, size: 18),
                onPressed: () {}),
            Text(song.albumName ?? 'Music',
                style: const TextStyle(
                    color: kTextPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            IconButton(
                icon:
                    const Icon(Icons.more_horiz, color: kTextPrimary, size: 18),
                onPressed: () {}),
          ]),
        ),
        // Cover
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: song.coverUrl != null
                ? Image.network(song.coverUrl!,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _placeholder())
                : _placeholder(),
          ),
        ),
        const SizedBox(height: 16),
        // Info
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(song.title,
                      style: const TextStyle(
                          color: kTextPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  Text(song.artist ?? 'Unknown',
                      style: const TextStyle(color: kTextSecond, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ])),
            IconButton(
              icon: const Icon(Icons.add_circle_outline,
                  color: kTextSecond, size: 22),
              onPressed: () => showModalBottomSheet(
                context: context,
                backgroundColor: Colors.transparent,
                isScrollControlled: true,
                builder: (_) => AddToPlaylistSheet(songId: song.id),
              ),
            ),
          ]),
        ),
        // About artist section
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Sobre o artista',
                  style: TextStyle(
                      color: kTextPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700))),
        ),
      ]),
    );
  }

  Widget _placeholder() => Container(
      height: 248,
      color: const Color(0xFF2A2A2A),
      child: const Icon(Icons.music_note, color: kTextMuted, size: 48));
}

class _TvRightPlaceholder extends StatelessWidget {
  const _TvRightPlaceholder();
  @override
  Widget build(BuildContext context) => Container(
        color: const Color(0xFF0A0A0A),
        child: const Center(
            child: Text('Nada tocando', style: TextStyle(color: kTextMuted))),
      );
}
