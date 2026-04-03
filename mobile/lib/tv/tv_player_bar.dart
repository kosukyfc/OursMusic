import 'package:flutter/material.dart';
import '../theme.dart';
import '../player/player_controller.dart';

/// Bottom player bar for TV — like Spotify desktop.
class TvPlayerBar extends StatelessWidget {
  final PlayerController player;
  const TvPlayerBar({super.key, required this.player});

  @override
  Widget build(BuildContext context) {
    final song = player.current;
    return Container(
      height: 72,
      color: const Color(0xFF181818),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(children: [
        // Left: song info
        SizedBox(width: 280, child: song == null
          ? const SizedBox()
          : Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: song.coverUrl != null
                  ? Image.network(song.coverUrl!, width: 52, height: 52, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(song.title, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(song.artist ?? '', style: const TextStyle(color: kTextSecond, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
              ])),
              IconButton(icon: const Icon(Icons.favorite_border, color: kTextSecond, size: 18), onPressed: () {}),
              IconButton(icon: const Icon(Icons.picture_in_picture_alt, color: kTextSecond, size: 18), onPressed: () {}),
            ]),
        ),

        // Center: controls + progress
        Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            IconButton(icon: Icon(Icons.shuffle, color: player.shuffle ? kAccent : kTextSecond, size: 18), onPressed: player.toggleShuffle),
            IconButton(icon: const Icon(Icons.skip_previous, color: kTextPrimary, size: 28), onPressed: player.skipPrev),
            GestureDetector(
              onTap: player.togglePlay,
              child: Container(
                width: 36, height: 36,
                decoration: const BoxDecoration(color: kTextPrimary, shape: BoxShape.circle),
                child: Icon(player.playing ? Icons.pause : Icons.play_arrow, color: Colors.black, size: 22),
              ),
            ),
            IconButton(icon: const Icon(Icons.skip_next, color: kTextPrimary, size: 28), onPressed: player.skipNext),
            IconButton(
              icon: Icon(player.repeat == LoopMode.one ? Icons.repeat_one : Icons.repeat, color: player.repeat != LoopMode.off ? kAccent : kTextSecond, size: 18),
              onPressed: player.cycleRepeat,
            ),
          ]),
          // Progress
          Row(children: [
            Text(_fmt(player.position), style: const TextStyle(color: kTextMuted, fontSize: 11)),
            const SizedBox(width: 8),
            Expanded(child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor: kTextPrimary,
                inactiveTrackColor: const Color(0xFF4A4A4A),
                thumbColor: kTextPrimary,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                trackHeight: 3,
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 10),
              ),
              child: Slider(value: player.progress.clamp(0.0, 1.0), onChanged: player.seek),
            )),
            const SizedBox(width: 8),
            Text(_fmt(player.duration), style: const TextStyle(color: kTextMuted, fontSize: 11)),
          ]),
        ])),

        // Right: volume + extras
        SizedBox(width: 280, child: Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          IconButton(icon: const Icon(Icons.lyrics_outlined, color: kTextSecond, size: 18), onPressed: () {}),
          IconButton(icon: const Icon(Icons.queue_music, color: kTextSecond, size: 18), onPressed: () {}),
          IconButton(icon: const Icon(Icons.devices_other, color: kTextSecond, size: 18), onPressed: () {}),
          const Icon(Icons.volume_up, color: kTextSecond, size: 18),
          SizedBox(width: 100, child: SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: kTextSecond,
              inactiveTrackColor: const Color(0xFF4A4A4A),
              thumbColor: kTextPrimary,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
              trackHeight: 3,
            ),
            child: Slider(value: player.volume, onChanged: player.setVolume),
          )),
          IconButton(icon: const Icon(Icons.fullscreen, color: kTextSecond, size: 18), onPressed: () {}),
        ])),
      ]),
    );
  }

  Widget _placeholder() => Container(width: 52, height: 52, color: const Color(0xFF2A2A2A), child: const Icon(Icons.music_note, color: kTextMuted));
  String _fmt(Duration d) { final m = d.inMinutes, s = d.inSeconds % 60; return '$m:${s.toString().padLeft(2, '0')}'; }
}
