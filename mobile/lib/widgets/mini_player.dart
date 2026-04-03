import 'package:flutter/material.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import '../screens/player_screen.dart';

class MiniPlayer extends StatelessWidget {
  final PlayerController player;
  const MiniPlayer({super.key, required this.player});

  @override
  Widget build(BuildContext context) {
    final song = player.current!;
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PlayerScreen(player: player))),
      child: Container(
        margin: const EdgeInsets.fromLTRB(8, 0, 8, 8),
        decoration: BoxDecoration(
          color: const Color(0xFF282828),
          borderRadius: BorderRadius.circular(10),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 20, offset: const Offset(0, 4))],
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // Progress bar at top
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
            child: LinearProgressIndicator(
              value: player.progress.clamp(0.0, 1.0),
              backgroundColor: const Color(0xFF3A3A3A),
              valueColor: const AlwaysStoppedAnimation<Color>(kTextPrimary),
              minHeight: 2,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Row(children: [
              // Cover
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: song.coverUrl != null
                  ? Image.network(song.coverUrl!, width: 48, height: 48, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
              ),
              const SizedBox(width: 10),
              // Info
              Expanded(child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(song.title, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(song.artist ?? '', style: const TextStyle(color: kTextSecond, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              )),
              // Controls
              IconButton(
                icon: const Icon(Icons.favorite_border, color: kTextPrimary, size: 22),
                onPressed: () {},
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              IconButton(
                icon: Icon(player.playing ? Icons.pause : Icons.play_arrow, color: kTextPrimary, size: 28),
                onPressed: player.togglePlay,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              IconButton(
                icon: const Icon(Icons.skip_next, color: kTextPrimary, size: 28),
                onPressed: player.skipNext,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              const SizedBox(width: 4),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _placeholder() => Container(
    width: 48, height: 48, color: const Color(0xFF3A3A3A),
    child: const Icon(Icons.music_note, color: kTextMuted, size: 24),
  );
}
