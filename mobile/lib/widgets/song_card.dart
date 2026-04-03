import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';

class SongCard extends StatelessWidget {
  final Song song;
  final VoidCallback onTap;
  const SongCard({super.key, required this.song, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: kBgElevated, borderRadius: BorderRadius.circular(8)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover art
            Expanded(
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                    child: song.coverUrl != null
                        ? Image.network(song.coverUrl!, width: double.infinity, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _placeholder())
                        : _placeholder(),
                  ),
                  // Play button overlay
                  Positioned(
                    bottom: 8, right: 8,
                    child: Container(
                      width: 44, height: 44,
                      decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
                      child: const Icon(Icons.play_arrow, color: Colors.black, size: 24),
                    ),
                  ),
                  if (song.available == false)
                    Positioned(
                      bottom: 8, left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(4)),
                        child: const Text('EM BREVE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.black)),
                      ),
                    ),
                ],
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(song.title, style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(song.artist ?? 'Artista desconhecido', style: const TextStyle(color: kTextSecond, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
    width: double.infinity, height: double.infinity, color: kBgHighlight,
    child: const Icon(Icons.music_note, color: kTextMuted, size: 40),
  );
}
