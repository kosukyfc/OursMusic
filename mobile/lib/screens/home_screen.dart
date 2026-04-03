import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../widgets/mini_player.dart';
import '../widgets/premium_avatar.dart';
import 'search_screen.dart';
import 'library_screen.dart';
import '../player/player_controller.dart';
import '../services/download_service.dart';
import 'profile_screen.dart';
import 'player_screen.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onLogout;
  const HomeScreen({super.key, required this.onLogout});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  List<Song> _songs = [];
  bool _loading = true;
  bool _offlineMode = false;
  final _player = PlayerController();
  final _downloads = DownloadService();
  String _userPlan = 'free';

  @override
  void initState() {
    super.initState();
    _loadSongs();
    _downloads.loadDownloads();
    _loadUserPlan();
  }

  Future<void> _loadUserPlan() async {
    try {
      final data = await Api.get('/social/profile/me');
      if (data is Map<String, dynamic> && mounted) {
        setState(() => _userPlan = data['plan']?.toString() ?? 'free');
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

  bool get _isTablet {
    final size = MediaQuery.of(context).size;
    return size.shortestSide >= 600;
  }

  @override
  Widget build(BuildContext context) {
    if (_isTablet) return _buildTabletLayout();
    return _buildPhoneLayout();
  }

  // ── Phone layout ──────────────────────────────────────────────────────────
  Widget _buildPhoneLayout() {
    final tabs = [
      _HomeContent(songs: _songs, loading: _loading, player: _player,
        downloads: _downloads, userPlan: _userPlan,
        onLogout: widget.onLogout, offlineMode: _offlineMode,
        onToggleOffline: () => setState(() => _offlineMode = !_offlineMode)),
      SearchScreen(songs: _songs, player: _player),
      LibraryScreen(songs: _songs, player: _player),
    ];

    return Scaffold(
      backgroundColor: kBgBase,
      body: Stack(children: [
        tabs[_tab],
        Positioned(
          left: 0, right: 0,
          bottom: kBottomNavigationBarHeight,
          child: ListenableBuilder(
            listenable: _player,
            builder: (_, __) => _player.current != null
              ? MiniPlayer(player: _player)
              : const SizedBox.shrink(),
          ),
        ),
      ]),
      bottomNavigationBar: _BottomNav(current: _tab, onTap: (i) => setState(() => _tab = i)),
    );
  }

  // ── Tablet layout — sidebar + content (Spotify 2026 style) ───────────────
  Widget _buildTabletLayout() {
    final tabs = [
      _HomeContent(songs: _songs, loading: _loading, player: _player,
        downloads: _downloads, userPlan: _userPlan,
        onLogout: widget.onLogout, offlineMode: _offlineMode,
        onToggleOffline: () => setState(() => _offlineMode = !_offlineMode)),
      SearchScreen(songs: _songs, player: _player),
      LibraryScreen(songs: _songs, player: _player),
    ];

    return Scaffold(
      backgroundColor: kBgBase,
      body: Column(children: [
        Expanded(
          child: Row(children: [
            // Sidebar
            _TabletSidebar(
              current: _tab,
              onTap: (i) => setState(() => _tab = i),
              onLogout: widget.onLogout,
            ),
            // Main content
            Expanded(child: tabs[_tab]),
          ]),
        ),
        // Bottom player bar
        ListenableBuilder(
          listenable: _player,
          builder: (_, __) => _player.current != null
            ? _TabletPlayerBar(player: _player)
            : const SizedBox.shrink(),
        ),
      ]),
    );
  }
}

// ── Bottom nav (phone) ────────────────────────────────────────────────────────
class _BottomNav extends StatelessWidget {
  final int current;
  final ValueChanged<int> onTap;
  const _BottomNav({required this.current, required this.onTap});

  @override
  Widget build(BuildContext context) => BottomNavigationBar(
    currentIndex: current,
    onTap: onTap,
    backgroundColor: const Color(0xFF0A0A0A),
    selectedItemColor: kTextPrimary,
    unselectedItemColor: kTextMuted,
    type: BottomNavigationBarType.fixed,
    selectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
    unselectedLabelStyle: const TextStyle(fontSize: 10),
    items: const [
      BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
      BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search'),
      BottomNavigationBarItem(icon: Icon(Icons.library_music_outlined), activeIcon: Icon(Icons.library_music), label: 'Biblioteca'),
    ],
  );
}

// ── Tablet sidebar ────────────────────────────────────────────────────────────
class _TabletSidebar extends StatelessWidget {
  final int current;
  final ValueChanged<int> onTap;
  final VoidCallback onLogout;
  const _TabletSidebar({required this.current, required this.onTap, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      color: const Color(0xFF0A0A0A),
      child: SafeArea(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Logo
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: Row(children: [
              Container(
                width: 32, height: 32,
                decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
                child: const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 20),
              ),
              const SizedBox(width: 10),
              const Text('OursMusic', style: TextStyle(color: kTextPrimary, fontSize: 16, fontWeight: FontWeight.w900)),
            ]),
          ),

          // Nav items
          _SidebarItem(icon: Icons.home, label: 'Home', selected: current == 0, onTap: () => onTap(0)),
          _SidebarItem(icon: Icons.search, label: 'Search', selected: current == 1, onTap: () => onTap(1)),
          _SidebarItem(icon: Icons.library_music_outlined, label: 'Your Library', selected: current == 2, onTap: () => onTap(2)),

          const Divider(color: Color(0xFF2A2A2A), height: 32, indent: 16, endIndent: 16),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Playlists', style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
          ),
          const SizedBox(height: 8),

          const Spacer(),

          // Logout
          ListTile(
            leading: const Icon(Icons.person_outline, color: kTextMuted, size: 20),
            title: const Text('Perfil', style: TextStyle(color: kTextMuted, fontSize: 13)),
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => ProfileScreen(onLogout: onLogout))),
            dense: true,
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: kTextMuted, size: 20),
            title: const Text('Sair', style: TextStyle(color: kTextMuted, fontSize: 13)),
            onTap: onLogout,
            dense: true,
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}

class _SidebarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _SidebarItem({required this.icon, required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon, color: selected ? kTextPrimary : kTextMuted, size: 22),
    title: Text(label, style: TextStyle(
      color: selected ? kTextPrimary : kTextMuted,
      fontSize: 14, fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
    onTap: onTap,
    dense: true,
    selected: selected,
    selectedTileColor: const Color(0xFF1A1A1A),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
  );
}

// ── Tablet player bar ─────────────────────────────────────────────────────────
class _TabletPlayerBar extends StatelessWidget {
  final PlayerController player;
  const _TabletPlayerBar({required this.player});

  @override
  Widget build(BuildContext context) {
    final song = player.current!;
    return GestureDetector(
      // Tap anywhere on the bar (except controls) opens full player
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PlayerScreen(player: player))),
      child: Container(
        height: 72,
        decoration: const BoxDecoration(
          color: Color(0xFF181818),
          border: Border(top: BorderSide(color: Color(0xFF2A2A2A))),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(children: [
          // Cover + info — tap opens player
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: song.coverUrl != null
              ? Image.network(song.coverUrl!, width: 48, height: 48, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _placeholder())
              : _placeholder(),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(song.title, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(song.artist ?? '', style: const TextStyle(color: kTextSecond, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),

          // Controls — stop propagation so they don't open player
          IconButton(
            icon: const Icon(Icons.skip_previous, color: kTextPrimary, size: 28),
            onPressed: player.skipPrev,
          ),
          GestureDetector(
            onTap: player.togglePlay,
            behavior: HitTestBehavior.opaque,
            child: Container(
              width: 40, height: 40,
              decoration: const BoxDecoration(color: kTextPrimary, shape: BoxShape.circle),
              child: Icon(player.playing ? Icons.pause : Icons.play_arrow, color: Colors.black, size: 24),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.skip_next, color: kTextPrimary, size: 28),
            onPressed: player.skipNext,
          ),

          // Progress bar
          Expanded(child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor: kTextPrimary,
                inactiveTrackColor: const Color(0xFF4A4A4A),
                thumbColor: kTextPrimary,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                trackHeight: 3,
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 10),
              ),
              child: Slider(value: player.progress.clamp(0.0, 1.0), onChanged: player.seek),
            ),
          )),

          // Expand icon hint
          const Icon(Icons.keyboard_arrow_up, color: kTextMuted, size: 20),
          const SizedBox(width: 8),
        ]),
      ),
    );
  }

  Widget _placeholder() => Container(width: 48, height: 48, color: const Color(0xFF2A2A2A),
    child: const Icon(Icons.music_note, color: kTextMuted));
}

// ── Home content ──────────────────────────────────────────────────────────────
class _HomeContent extends StatelessWidget {
  final List<Song> songs;
  final bool loading;
  final PlayerController player;
  final DownloadService downloads;
  final String userPlan;
  final VoidCallback onLogout;
  final bool offlineMode;
  final VoidCallback onToggleOffline;

  const _HomeContent({
    required this.songs, required this.loading, required this.player,
    required this.downloads, required this.userPlan,
    required this.onLogout, required this.offlineMode, required this.onToggleOffline,
  });

  bool get _isPremium => userPlan == 'premium' || userPlan == 'family';

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    final recent = songs.take(isTablet ? 8 : 6).toList();
    final featured = songs.take(isTablet ? 12 : 8).toList();

    return CustomScrollView(slivers: [
      SliverAppBar(
        pinned: true,
        backgroundColor: kBgBase,
        automaticallyImplyLeading: false,
        title: Text(greeting, style: const TextStyle(color: kTextPrimary, fontSize: 22, fontWeight: FontWeight.w900)),
        actions: [
          // Offline toggle
          GestureDetector(
            onTap: onToggleOffline,
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: offlineMode ? kAccent.withOpacity(0.15) : const Color(0xFF2A2A2A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: offlineMode ? kAccent : Colors.transparent),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.cloud_done, color: offlineMode ? kAccent : kTextMuted, size: 14),
                const SizedBox(width: 4),
                Text('Offline', style: TextStyle(color: offlineMode ? kAccent : kTextMuted, fontSize: 10, fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
          // Avatar
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => ProfileScreen(onLogout: onLogout))),
            child: Padding(
              padding: const EdgeInsets.only(right: 12),
              child: PremiumAvatar(
                name: 'U',
                plan: userPlan,
                playing: player.current != null,
                size: 32,
              ),
            ),
          ),
        ],
      ),

      if (loading)
        const SliverFillRemaining(child: Center(child: CircularProgressIndicator(color: kAccent)))
      else if (songs.isEmpty)
        SliverFillRemaining(child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.music_off, size: 64, color: kTextMuted),
          const SizedBox(height: 16),
          const Text('No songs yet', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
        ])))
      else ...[
        // Filter chips
        SliverToBoxAdapter(child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Row(children: [
            _Chip(label: 'All', selected: true),
            const SizedBox(width: 8),
            _Chip(label: 'Music'),
            const SizedBox(width: 8),
            _Chip(label: 'Podcasts'),
          ]),
        )),

        // Quick grid — compact tiles
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          sliver: SliverGrid(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => _QuickTile(
                song: recent[i],
                onTap: () => player.play(recent[i], songs),
                downloads: downloads,
                userPlan: userPlan,
              ),
              childCount: recent.length,
            ),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: isTablet ? 3 : 2,
              childAspectRatio: isTablet ? 4.5 : 3.8,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
          ),
        ),

        // "Your top mixes" section
        SliverToBoxAdapter(child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 28, 16, 12),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Your top mixes', style: TextStyle(color: kTextPrimary, fontSize: 20, fontWeight: FontWeight.w800)),
            if (_isPremium)
              GestureDetector(
                onTap: () => downloads.downloadAll(featured, userPlan),
                child: Row(children: [
                  const Icon(Icons.download, color: kAccent, size: 16),
                  const SizedBox(width: 4),
                  const Text('Download all', style: TextStyle(color: kAccent, fontSize: 12, fontWeight: FontWeight.w700)),
                ]),
              ),
          ]),
        )),
        SliverToBoxAdapter(child: SizedBox(
          height: isTablet ? 230 : 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: featured.length,
            itemBuilder: (ctx, i) => _AlbumCard(
              song: featured[i],
              onTap: () => player.play(featured[i], songs),
              downloads: downloads,
              userPlan: userPlan,
              size: isTablet ? 180.0 : 150.0,
            ),
          ),
        )),

        const SliverPadding(padding: EdgeInsets.only(bottom: 160)),
      ],
    ]);
  }
}

// ── Filter chip ───────────────────────────────────────────────────────────────
class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  const _Chip({required this.label, this.selected = false});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
    decoration: BoxDecoration(
      color: selected ? kAccent : const Color(0xFF2A2A2A),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(label, style: TextStyle(
      color: selected ? Colors.black : kTextPrimary,
      fontSize: 13, fontWeight: FontWeight.w600)),
  );
}

// ── Quick tile — compact, fixed height ────────────────────────────────────────
class _QuickTile extends StatelessWidget {
  final Song song;
  final VoidCallback onTap;
  final DownloadService downloads;
  final String userPlan;
  const _QuickTile({required this.song, required this.onTap, required this.downloads, required this.userPlan});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(color: const Color(0xFF2A2A2A), borderRadius: BorderRadius.circular(4)),
        child: Row(children: [
          ClipRRect(
            borderRadius: const BorderRadius.horizontal(left: Radius.circular(4)),
            child: song.coverUrl != null
              ? Image.network(song.coverUrl!, width: 52, height: 52, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _placeholder())
              : _placeholder(),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(song.title,
            style: const TextStyle(color: kTextPrimary, fontSize: 12, fontWeight: FontWeight.w700),
            maxLines: 1, overflow: TextOverflow.ellipsis)),
          // Download button
          ListenableBuilder(
            listenable: downloads,
            builder: (_, __) {
              final status = downloads.getStatus(song.id);
              if (status == DownloadStatus.ready) {
                return const Padding(padding: EdgeInsets.only(right: 8),
                  child: Icon(Icons.cloud_done, color: kAccent, size: 16));
              }
              if (status == DownloadStatus.downloading) {
                return const Padding(padding: EdgeInsets.only(right: 8),
                  child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: kAccent, strokeWidth: 2)));
              }
              if (userPlan != 'free') {
                return IconButton(
                  icon: const Icon(Icons.download, color: kTextMuted, size: 16),
                  onPressed: () => downloads.downloadSong(song.id, userPlan),
                  padding: const EdgeInsets.only(right: 4),
                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                );
              }
              return const SizedBox(width: 8);
            },
          ),
        ]),
      ),
    );
  }

  Widget _placeholder() => Container(width: 52, height: 52, color: kAccent,
    child: const Icon(Icons.music_note, color: Colors.black, size: 24));
}

// ── Album card ────────────────────────────────────────────────────────────────
class _AlbumCard extends StatelessWidget {
  final Song song;
  final VoidCallback onTap;
  final DownloadService downloads;
  final String userPlan;
  final double size;
  const _AlbumCard({required this.song, required this.onTap, required this.downloads, required this.userPlan, required this.size});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        margin: const EdgeInsets.only(right: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Stack(children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: song.coverUrl != null
                ? Image.network(song.coverUrl!, width: size, height: size, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _placeholder())
                : _placeholder(),
            ),
            // Download button overlay
            if (userPlan != 'free')
              Positioned(bottom: 8, right: 8,
                child: ListenableBuilder(
                  listenable: downloads,
                  builder: (_, __) {
                    final status = downloads.getStatus(song.id);
                    if (status == DownloadStatus.ready) {
                      return Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
                        child: const Icon(Icons.cloud_done, color: Colors.black, size: 14),
                      );
                    }
                    if (status == DownloadStatus.downloading) {
                      return Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(color: Colors.black.withOpacity(0.7), shape: BoxShape.circle),
                        child: const Padding(padding: EdgeInsets.all(6),
                          child: CircularProgressIndicator(color: kAccent, strokeWidth: 2)),
                      );
                    }
                    return GestureDetector(
                      onTap: () => downloads.downloadSong(song.id, userPlan),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(color: Colors.black.withOpacity(0.7), shape: BoxShape.circle),
                        child: const Icon(Icons.download, color: kTextPrimary, size: 16),
                      ),
                    );
                  },
                ),
              ),
          ]),
          const SizedBox(height: 6),
          Text(song.title, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600),
            maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(song.artist ?? 'Unknown', style: const TextStyle(color: kTextSecond, fontSize: 11),
            maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }

  Widget _placeholder() => Container(width: size, height: size, color: kAccent,
    child: Icon(Icons.music_note, color: Colors.black, size: size * 0.4));
}
