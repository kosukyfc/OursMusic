import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import '../widgets/premium_avatar.dart';
import '../widgets/song_card.dart';
import '../services/social_service.dart';

class UserProfileScreen extends StatefulWidget {
  final String userId;
  final PlayerController player;
  const UserProfileScreen(
      {super.key, required this.userId, required this.player});
  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  final _social = SocialService();
  Map<String, dynamic>? _profile;
  List<Song> _songs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final profile = await _social.getProfile(widget.userId);
      final songsData = await Api.get('/songs?uploadedBy=${widget.userId}');
      if (mounted) {
        setState(() {
          _profile = profile;
          if (songsData is List) {
            _songs = songsData
                .whereType<Map<String, dynamic>>()
                .map(Song.fromJson)
                .toList();
          }
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
    await _social.loadFollowing();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final plan = _profile?['plan']?.toString() ?? 'free';
    final name = _profile?['name']?.toString() ??
        _profile?['email']?.toString() ??
        'Usuário';
    final username = _profile?['username']?.toString();
    final bio = _profile?['bio']?.toString() ?? '';
    final followers = _profile?['followersCount'] ?? 0;
    final following = _profile?['followingCount'] ?? 0;

    return Scaffold(
      backgroundColor: kBgBase,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kAccent))
          : CustomScrollView(slivers: [
              SliverAppBar(
                expandedHeight: 160,
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
                        colors: [kAccent.withValues(alpha: 0.2), kBgBase],
                      ),
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                  child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Avatar + follow button
                      Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            PremiumAvatar(
                              name: name,
                              plan: plan,
                              avatarUrl: _profile?['avatarUrl'],
                              playing: false,
                              size: 80,
                            ),
                            ListenableBuilder(
                              listenable: _social,
                              builder: (_, __) {
                                final following_ =
                                    _social.isFollowing(widget.userId);
                                return OutlinedButton(
                                  onPressed: () =>
                                      _social.toggleFollow(widget.userId),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor:
                                        following_ ? kTextMuted : kTextPrimary,
                                    side: BorderSide(
                                        color: following_
                                            ? kTextMuted
                                            : kTextPrimary),
                                    shape: RoundedRectangleBorder(
                                        borderRadius:
                                            BorderRadius.circular(20)),
                                  ),
                                  child: Text(
                                      following_ ? 'Seguindo' : 'Seguir',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700)),
                                );
                              },
                            ),
                          ]),

                      const SizedBox(height: 12),
                      Text(name,
                          style: const TextStyle(
                              color: kTextPrimary,
                              fontSize: 22,
                              fontWeight: FontWeight.w900)),
                      if (username != null)
                        Text('@$username',
                            style: const TextStyle(
                                color: kTextSecond, fontSize: 13)),
                      if (bio.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(bio,
                            style: const TextStyle(
                                color: kTextSecond, fontSize: 14, height: 1.4)),
                      ],

                      const SizedBox(height: 12),
                      Row(children: [
                        _Stat(count: followers, label: 'seguidores'),
                        const SizedBox(width: 24),
                        _Stat(count: following, label: 'seguindo'),
                      ]),

                      if (_songs.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        const Text('Músicas',
                            style: TextStyle(
                                color: kTextPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w800)),
                        const SizedBox(height: 12),
                      ],
                    ]),
              )),
              if (_songs.isNotEmpty)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                  sliver: SliverGrid(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => SongCard(
                        song: _songs[i],
                        onTap: () => widget.player.play(_songs[i], _songs),
                      ),
                      childCount: _songs.length,
                    ),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                  ),
                ),
            ]),
    );
  }
}

class _Stat extends StatelessWidget {
  final int count;
  final String label;
  const _Stat({required this.count, required this.label});
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$count',
            style: const TextStyle(
                color: kTextPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w800)),
        Text(label, style: const TextStyle(color: kTextSecond, fontSize: 12)),
      ]);
}
