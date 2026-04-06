import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import '../screens/player_screen.dart';
import '../widgets/mini_player.dart';

class LibraryScreen extends StatefulWidget {
  final List<Song> songs;
  final PlayerController player;
  const LibraryScreen({super.key, required this.songs, required this.player});
  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  List<Playlist> _playlists = [];
  List<Song> _favorites = [];
  bool _loadingPlaylists = true;
  bool _loadingFavorites = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _loadPlaylists();
    _loadFavorites();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadPlaylists() async {
    try {
      final data = await Api.get('/playlists');
      if (data is List && mounted) {
        setState(() {
          _playlists = data
              .whereType<Map<String, dynamic>>()
              .map(Playlist.fromJson)
              .toList();
          _loadingPlaylists = false;
        });
      } else {
        if (mounted) setState(() => _loadingPlaylists = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loadingPlaylists = false);
    }
  }

  Future<void> _loadFavorites() async {
    try {
      final data = await Api.get('/favorites');
      if (data is List && mounted) {
        setState(() {
          _favorites = data
              .whereType<Map<String, dynamic>>()
              .map((j) => Song.fromJson(j['song'] ?? j))
              .toList();
          _loadingFavorites = false;
        });
      } else {
        if (mounted) setState(() => _loadingFavorites = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loadingFavorites = false);
    }
  }

  Future<void> _createPlaylist() async {
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
      if (data is Map<String, dynamic> && mounted) {
        setState(() => _playlists.insert(0, Playlist.fromJson(data)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _deletePlaylist(Playlist pl) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF282828),
        title: const Text('Excluir playlist?',
            style: TextStyle(color: kTextPrimary)),
        content: Text('Tem certeza que quer excluir "${pl.title}"?',
            style: const TextStyle(color: kTextSecond)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child:
                  const Text('Cancelar', style: TextStyle(color: kTextMuted))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF15E6C),
                foregroundColor: Colors.white),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await Api.delete('/playlists/${pl.id}');
      if (mounted) setState(() => _playlists.removeWhere((p) => p.id == pl.id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      Scaffold(
        backgroundColor: kBgBase,
        appBar: AppBar(
          backgroundColor: kBgBase,
          automaticallyImplyLeading: false,
          title: const Text('Sua Biblioteca',
              style: TextStyle(
                  color: kTextPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w900)),
          actions: [
            IconButton(
              icon: const Icon(Icons.add, color: kTextPrimary),
              onPressed: _createPlaylist,
              tooltip: 'Nova playlist',
            ),
          ],
          bottom: TabBar(
            controller: _tabs,
            labelColor: kTextPrimary,
            unselectedLabelColor: kTextMuted,
            indicatorColor: kAccent,
            tabs: const [Tab(text: 'Playlists'), Tab(text: 'Favoritos')],
          ),
        ),
        body: TabBarView(
          controller: _tabs,
          children: [
            _PlaylistsTab(
              playlists: _playlists,
              loading: _loadingPlaylists,
              player: widget.player,
              onDelete: _deletePlaylist,
              onRefresh: _loadPlaylists,
            ),
            _FavoritesTab(
              favorites: _favorites,
              loading: _loadingFavorites,
              player: widget.player,
              onRefresh: _loadFavorites,
            ),
          ],
        ),
      ),
      // Mini player overlay
      Positioned(
        left: 0,
        right: 0,
        bottom: 0,
        child: ListenableBuilder(
          listenable: widget.player,
          builder: (_, __) => widget.player.current != null
              ? MiniPlayer(player: widget.player)
              : const SizedBox.shrink(),
        ),
      ),
    ]);
  }
}

// ── Playlists tab ─────────────────────────────────────────────────────────────
class _PlaylistsTab extends StatelessWidget {
  final List<Playlist> playlists;
  final bool loading;
  final PlayerController player;
  final void Function(Playlist) onDelete;
  final Future<void> Function() onRefresh;

  const _PlaylistsTab({
    required this.playlists,
    required this.loading,
    required this.player,
    required this.onDelete,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    if (playlists.isEmpty) {
      return const Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.queue_music, size: 64, color: kTextMuted),
        SizedBox(height: 16),
        Text('Nenhuma playlist ainda',
            style: TextStyle(
                color: kTextPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700)),
        SizedBox(height: 8),
        Text('Toque em + para criar uma',
            style: TextStyle(color: kTextMuted, fontSize: 14)),
      ]));
    }
    return RefreshIndicator(
      color: kAccent,
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 160),
        itemCount: playlists.length,
        itemBuilder: (ctx, i) => _PlaylistTile(
          playlist: playlists[i],
          player: player,
          onDelete: () => onDelete(playlists[i]),
        ),
      ),
    );
  }
}

class _PlaylistTile extends StatelessWidget {
  final Playlist playlist;
  final PlayerController player;
  final VoidCallback onDelete;
  const _PlaylistTile(
      {required this.playlist, required this.player, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
            color: kAccent.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(6)),
        child: const Icon(Icons.queue_music, color: kAccent, size: 28),
      ),
      title: Text(playlist.title,
          style: const TextStyle(
              color: kTextPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
      subtitle: Text(
        '${playlist.songs.length} músicas • ${playlist.durationStr}',
        style: const TextStyle(color: kTextMuted, fontSize: 12),
      ),
      trailing: PopupMenuButton<String>(
        color: const Color(0xFF282828),
        icon: const Icon(Icons.more_vert, color: kTextMuted),
        onSelected: (v) {
          if (v == 'delete') onDelete();
          if (v == 'play' && playlist.songs.isNotEmpty) {
            player.play(playlist.songs.first, playlist.songs);
          }
        },
        itemBuilder: (_) => [
          const PopupMenuItem(
              value: 'play',
              child: Text('Reproduzir', style: TextStyle(color: kTextPrimary))),
          const PopupMenuItem(
              value: 'delete',
              child:
                  Text('Excluir', style: TextStyle(color: Color(0xFFF15E6C)))),
        ],
      ),
      onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                _PlaylistDetailScreen(playlist: playlist, player: player),
          )),
    );
  }
}

// ── Favorites tab ─────────────────────────────────────────────────────────────
class _FavoritesTab extends StatelessWidget {
  final List<Song> favorites;
  final bool loading;
  final PlayerController player;
  final Future<void> Function() onRefresh;

  const _FavoritesTab({
    required this.favorites,
    required this.loading,
    required this.player,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    if (favorites.isEmpty) {
      return const Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.favorite_border, size: 64, color: kTextMuted),
        SizedBox(height: 16),
        Text('Nenhum favorito ainda',
            style: TextStyle(
                color: kTextPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700)),
        SizedBox(height: 8),
        Text('Curta músicas para vê-las aqui',
            style: TextStyle(color: kTextMuted, fontSize: 14)),
      ]));
    }
    return RefreshIndicator(
      color: kAccent,
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 160),
        itemCount: favorites.length,
        itemBuilder: (ctx, i) {
          final song = favorites[i];
          return ListenableBuilder(
            listenable: player,
            builder: (_, __) {
              final isPlaying = player.current?.id == song.id;
              return ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                leading: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: song.coverUrl != null
                      ? Image.network(song.coverUrl!,
                          width: 52,
                          height: 52,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _placeholder())
                      : _placeholder(),
                ),
                title: Text(song.title,
                    style: TextStyle(
                        color: isPlaying ? kAccent : kTextPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                subtitle: Text(song.artist ?? 'Artista desconhecido',
                    style: const TextStyle(color: kTextMuted, fontSize: 12)),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(song.durationStr,
                      style: const TextStyle(color: kTextMuted, fontSize: 12)),
                  if (isPlaying) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.equalizer, color: kAccent, size: 18),
                  ],
                ]),
                onTap: () => player.play(song, favorites),
              );
            },
          );
        },
      ),
    );
  }

  Widget _placeholder() => Container(
      width: 52,
      height: 52,
      color: const Color(0xFF2A2A2A),
      child: const Icon(Icons.music_note, color: kTextMuted, size: 24));
}

// ── Playlist detail screen ────────────────────────────────────────────────────
class _PlaylistDetailScreen extends StatefulWidget {
  final Playlist playlist;
  final PlayerController player;
  const _PlaylistDetailScreen({required this.playlist, required this.player});
  @override
  State<_PlaylistDetailScreen> createState() => _PlaylistDetailScreenState();
}

class _PlaylistDetailScreenState extends State<_PlaylistDetailScreen> {
  late List<Song> _songs;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _songs = List.from(widget.playlist.songs);
    if (_songs.isEmpty) _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() => _loading = true);
    try {
      final data = await Api.get('/playlists/${widget.playlist.id}');
      if (data is Map<String, dynamic> && mounted) {
        final pl = Playlist.fromJson(data);
        setState(() {
          _songs = pl.songs;
          _loading = false;
        });
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _removeSong(Song song) async {
    try {
      await Api.delete('/playlists/${widget.playlist.id}/songs/${song.id}');
      if (mounted) setState(() => _songs.removeWhere((s) => s.id == song.id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgBase,
      body: CustomScrollView(slivers: [
        SliverAppBar(
          expandedHeight: 220,
          pinned: true,
          backgroundColor: kBgBase,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: kTextPrimary),
            onPressed: () => Navigator.pop(context),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [kAccent.withValues(alpha: 0.3), kBgBase],
                ),
              ),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 60),
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: kAccent.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                        border:
                            Border.all(color: kAccent.withValues(alpha: 0.3)),
                      ),
                      child: const Icon(Icons.queue_music,
                          color: kAccent, size: 56),
                    ),
                  ]),
            ),
            title: Text(widget.playlist.title,
                style: const TextStyle(
                    color: kTextPrimary, fontWeight: FontWeight.w800)),
          ),
        ),

        // Play button row
        SliverToBoxAdapter(
            child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Row(children: [
            Text('${_songs.length} músicas',
                style: const TextStyle(color: kTextMuted, fontSize: 13)),
            const Spacer(),
            if (_songs.isNotEmpty) ...[
              GestureDetector(
                onTap: () {
                  widget.player.play(_songs.first, _songs);
                  Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => PlayerScreen(player: widget.player)));
                },
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: const BoxDecoration(
                      color: kAccent, shape: BoxShape.circle),
                  child: const Icon(Icons.play_arrow,
                      color: Colors.black, size: 28),
                ),
              ),
            ],
          ]),
        )),

        if (_loading)
          const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: kAccent)))
        else if (_songs.isEmpty)
          const SliverFillRemaining(
              child: Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.music_off, size: 48, color: kTextMuted),
            SizedBox(height: 12),
            Text('Playlist vazia',
                style: TextStyle(color: kTextMuted, fontSize: 15)),
          ])))
        else
          SliverList(
              delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              final song = _songs[i];
              return ListenableBuilder(
                listenable: widget.player,
                builder: (_, __) {
                  final isPlaying = widget.player.current?.id == song.id;
                  return ListTile(
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: song.coverUrl != null
                          ? Image.network(song.coverUrl!,
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => _songPlaceholder())
                          : _songPlaceholder(),
                    ),
                    title: Text(song.title,
                        style: TextStyle(
                            color: isPlaying ? kAccent : kTextPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    subtitle: Text(song.artist ?? '',
                        style:
                            const TextStyle(color: kTextMuted, fontSize: 12)),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text(song.durationStr,
                          style:
                              const TextStyle(color: kTextMuted, fontSize: 12)),
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline,
                            color: kTextMuted, size: 20),
                        onPressed: () => _removeSong(song),
                        padding: EdgeInsets.zero,
                        constraints:
                            const BoxConstraints(minWidth: 32, minHeight: 32),
                      ),
                    ]),
                    onTap: () => widget.player.play(song, _songs),
                  );
                },
              );
            },
            childCount: _songs.length,
          )),

        const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
      ]),
    );
  }

  Widget _songPlaceholder() => Container(
      width: 48,
      height: 48,
      color: const Color(0xFF2A2A2A),
      child: const Icon(Icons.music_note, color: kTextMuted, size: 22));
}
