import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import '../screens/player_screen.dart';

class LibraryScreen extends StatefulWidget {
  final List<Song> songs;
  final PlayerController player;
  const LibraryScreen({super.key, required this.songs, required this.player});
  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  bool _albumOffline = true;
  bool _isDownloading = false;
  double _downloadProgress = 1.0;

  @override
  Widget build(BuildContext context) {
    final songs = widget.songs;

    return Stack(children: [
      CustomScrollView(slivers: [
        // Status bar
        SliverToBoxAdapter(child: _StatusBar()),

        // ── Green header ─────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Container(
            height: 280,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [kAccent, Color(0xFF0D5C2A), kBgBase],
                stops: [0.0, 0.6, 1.0],
              ),
            ),
            child: SafeArea(
              child: Column(children: [
                // Back button
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios, color: kTextPrimary, size: 20),
                      onPressed: () {},
                    ),
                  ]),
                ),
                // Album art
                Container(
                  width: 140, height: 140,
                  decoration: BoxDecoration(
                    color: kAccent,
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 8))],
                  ),
                  child: const Icon(Icons.music_note, color: Colors.black, size: 60),
                ),
                const SizedBox(height: 12),
                // Title
                const Text('Minha Biblioteca', style: TextStyle(color: kTextPrimary, fontSize: 24, fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                const Text('OursMusic', style: TextStyle(color: kTextSecond, fontSize: 13)),
                const Text('Album • 2024', style: TextStyle(color: kTextMuted, fontSize: 12)),
              ]),
            ),
          ),
        ),

        // ── Action buttons ────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(children: [
              // Download button
              GestureDetector(
                onTap: () {},
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: _albumOffline ? kAccent.withOpacity(0.15) : const Color(0xFF2A2A2A),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _albumOffline ? kAccent : const Color(0xFF4A4A4A)),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    if (_isDownloading)
                      SizedBox(
                        width: 16, height: 16,
                        child: CircularProgressIndicator(
                          value: _downloadProgress,
                          color: kAccent,
                          strokeWidth: 2,
                        ),
                      )
                    else
                      Icon(_albumOffline ? Icons.cloud_done : Icons.download,
                        color: _albumOffline ? kAccent : kTextPrimary, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      _albumOffline ? '28 songs • 1.2 GB downloaded' : 'Download',
                      style: TextStyle(
                        color: _albumOffline ? kAccent : kTextPrimary,
                        fontSize: 12, fontWeight: FontWeight.w700)),
                  ]),
                ),
              ),
              const Spacer(),
              // Available offline toggle
              Row(children: [
                const Text('Available Offline', style: TextStyle(color: kTextSecond, fontSize: 11)),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => setState(() => _albumOffline = !_albumOffline),
                  child: Container(
                    width: 40, height: 22,
                    decoration: BoxDecoration(
                      color: _albumOffline ? kAccent : const Color(0xFF4A4A4A),
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: AnimatedAlign(
                      duration: const Duration(milliseconds: 200),
                      alignment: _albumOffline ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        width: 18, height: 18,
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      ),
                    ),
                  ),
                ),
              ]),
            ]),
          ),
        ),

        // ── Controls row ──────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(children: [
              // Sort
              GestureDetector(
                onTap: () {},
                child: Row(children: [
                  const Icon(Icons.sort, color: kTextSecond, size: 16),
                  const SizedBox(width: 4),
                  const Text('Sort by: Offline first',
                    style: TextStyle(color: kTextSecond, fontSize: 12)),
                ]),
              ),
              const Spacer(),
              // Shuffle
              Container(
                width: 48, height: 48,
                decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
                child: const Icon(Icons.shuffle, color: Colors.black, size: 22),
              ),
              const SizedBox(width: 12),
              // Play
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFF2A2A2A),
                  shape: BoxShape.circle,
                  border: Border.all(color: kAccent),
                ),
                child: const Icon(Icons.pause, color: kTextPrimary, size: 22),
              ),
            ]),
          ),
        ),

        // ── Tracklist ─────────────────────────────────────────────────────
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              if (i >= songs.length) return null;
              final song = songs[i];
              final isDownloaded = i % 3 != 2;
              return _TrackRow(
                song: song,
                index: i,
                isDownloaded: isDownloaded,
                player: widget.player,
                songs: songs,
              );
            },
            childCount: songs.length,
          ),
        ),

        const SliverPadding(padding: EdgeInsets.only(bottom: 160)),
      ]),

      // ── Fixed mini-player ─────────────────────────────────────────────
      Positioned(
        left: 0, right: 0, bottom: 0,
        child: ListenableBuilder(
          listenable: widget.player,
          builder: (_, __) => widget.player.current != null
            ? _OfflineMiniPlayer(player: widget.player)
            : const SizedBox.shrink(),
        ),
      ),
    ]);
  }
}

class _TrackRow extends StatelessWidget {
  final Song song;
  final int index;
  final bool isDownloaded;
  final PlayerController player;
  final List<Song> songs;
  const _TrackRow({required this.song, required this.index, required this.isDownloaded,
    required this.player, required this.songs});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: player,
      builder: (_, __) {
        final isPlaying = player.current?.id == song.id;
        return ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          leading: Text('${index + 1}',
            style: TextStyle(color: isPlaying ? kAccent : kTextMuted, fontSize: 14, fontWeight: FontWeight.w600)),
          title: Text(song.title,
            style: TextStyle(color: isPlaying ? kAccent : kTextPrimary, fontSize: 14, fontWeight: FontWeight.w600),
            maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: Row(children: [
            if (isDownloaded) ...[
              const Icon(Icons.cloud_done, color: kAccent, size: 11),
              const SizedBox(width: 3),
              const Text('Downloaded', style: TextStyle(color: kAccent, fontSize: 11)),
              const Text(' • ', style: TextStyle(color: kTextMuted, fontSize: 11)),
            ],
            Text(song.artist ?? 'Unknown', style: const TextStyle(color: kTextSecond, fontSize: 11)),
          ]),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(song.durationStr, style: const TextStyle(color: kTextMuted, fontSize: 12)),
            const SizedBox(width: 8),
            // Individual download button
            Icon(
              isDownloaded ? Icons.cloud_done : Icons.download,
              color: isDownloaded ? kAccent : kTextMuted,
              size: 18),
            const SizedBox(width: 4),
            const Icon(Icons.more_vert, color: kTextMuted, size: 18),
          ]),
          onTap: () => player.play(song, songs),
        );
      },
    );
  }
}

// ── Offline mini-player ───────────────────────────────────────────────────────
class _OfflineMiniPlayer extends StatelessWidget {
  final PlayerController player;
  const _OfflineMiniPlayer({required this.player});

  @override
  Widget build(BuildContext context) {
    final song = player.current!;
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PlayerScreen(player: player))),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF1A1A1A),
          border: Border(top: BorderSide(color: kAccent, width: 2)),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // Offline status bar
          Container(
            width: double.infinity,
            color: kAccent.withOpacity(0.1),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(children: [
              const Icon(Icons.airplanemode_active, color: kAccent, size: 12),
              const SizedBox(width: 6),
              const Text('No internet connection – Playing from downloads',
                style: TextStyle(color: kAccent, fontSize: 10, fontWeight: FontWeight.w600)),
            ]),
          ),
          // Player row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(children: [
              // Cover
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: song.coverUrl != null
                  ? Image.network(song.coverUrl!, width: 44, height: 44, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
              ),
              const SizedBox(width: 10),
              // Info
              Expanded(child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(song.title,
                    style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                  Row(children: [
                    const Icon(Icons.cloud_done, color: kAccent, size: 11),
                    const SizedBox(width: 3),
                    const Text('Offline', style: TextStyle(color: kAccent, fontSize: 11, fontWeight: FontWeight.w600)),
                  ]),
                ],
              )),
              // Controls
              IconButton(
                icon: Icon(player.playing ? Icons.pause : Icons.play_arrow,
                  color: kTextPrimary, size: 26),
                onPressed: player.togglePlay,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              IconButton(
                icon: const Icon(Icons.skip_next, color: kTextPrimary, size: 26),
                onPressed: player.skipNext,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
            ]),
          ),
          // Progress bar
          LinearProgressIndicator(
            value: player.progress.clamp(0.0, 1.0),
            backgroundColor: const Color(0xFF3A3A3A),
            valueColor: const AlwaysStoppedAnimation<Color>(kAccent),
            minHeight: 2,
          ),
        ]),
      ),
    );
  }

  Widget _placeholder() => Container(width: 44, height: 44, color: kAccent,
    child: const Icon(Icons.music_note, color: Colors.black, size: 20));
}

class _StatusBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    color: kBgBase,
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      const Text('2:22', style: TextStyle(color: kTextPrimary, fontSize: 12, fontWeight: FontWeight.w700)),
      Row(children: [
        const Icon(Icons.signal_cellular_alt, color: kTextPrimary, size: 14),
        const SizedBox(width: 4),
        const Icon(Icons.wifi, color: kTextPrimary, size: 14),
        const SizedBox(width: 4),
        const Icon(Icons.battery_full, color: kTextPrimary, size: 14),
      ]),
    ]),
  );
}
