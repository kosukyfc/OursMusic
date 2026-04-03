import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';

class PlayerScreen extends StatefulWidget {
  final PlayerController player;
  const PlayerScreen({super.key, required this.player});
  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen>
    with SingleTickerProviderStateMixin {
  bool _showLyrics = false;
  bool _isOffline = true;
  bool _isDownloaded = true;
  Map<String, dynamic>? _lyricsData;
  bool _loadingLyrics = false;
  late TabController _tabCtrl;
  int _bottomTab = 0;

  // Interaction state
  Map<String, dynamic>? _stats;
  List<dynamic> _comments = [];
  bool _showComments = false;
  final _commentCtrl = TextEditingController();
  bool _sendingComment = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    widget.player.addListener(_onSongChange);
    _loadStats();
  }

  void _onSongChange() {
    if (widget.player.current?.id != _stats?['songId']) {
      _loadStats();
    }
  }

  Future<void> _loadStats() async {
    final song = widget.player.current;
    if (song == null) return;
    try {
      final data = await Api.get('/songs/${song.id}/interactions');
      if (data is Map<String, dynamic> && mounted) {
        setState(() => _stats = {...data, 'songId': song.id});
      }
    } catch (_) {}
  }

  Future<void> _loadComments() async {
    final song = widget.player.current;
    if (song == null) return;
    try {
      final data = await Api.get('/songs/${song.id}/interactions/comments');
      if (data is List && mounted) setState(() => _comments = data);
    } catch (_) {}
  }

  Future<void> _toggleLike(String type) async {
    final song = widget.player.current;
    if (song == null) return;
    try {
      final current = _stats?['userLike'];
      dynamic data;
      if (current == type) {
        data = await _deleteLike(song.id);
      } else {
        data = await Api.post('/songs/${song.id}/interactions/$type', {});
      }
      if (data is Map<String, dynamic> && mounted) {
        setState(() => _stats = {...data, 'songId': song.id});
      }
    } catch (_) {}
  }

  Future<Map<String, dynamic>> _deleteLike(String songId) async {
    final res = await Api.post('/songs/$songId/interactions/like', {'_method': 'DELETE'});
    if (res is Map<String, dynamic>) return res;
    return {};
  }

  Future<void> _toggleSave() async {
    final song = widget.player.current;
    if (song == null) return;
    try {
      final data = await Api.post('/songs/${song.id}/interactions/save', {});
      if (data is Map<String, dynamic> && mounted) {
        setState(() => _stats = {...?_stats, 'isSaved': data['saved'], 'songId': song.id});
      }
    } catch (_) {}
  }

  Future<void> _sendComment() async {
    final song = widget.player.current;
    if (song == null || _commentCtrl.text.trim().isEmpty) return;
    setState(() => _sendingComment = true);
    try {
      await Api.post('/songs/${song.id}/interactions/comments', {'text': _commentCtrl.text.trim()});
      _commentCtrl.clear();
      await _loadComments();
      await _loadStats();
    } catch (_) {}
    if (mounted) setState(() => _sendingComment = false);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _commentCtrl.dispose();
    widget.player.removeListener(_onSongChange);
    super.dispose();
  }

  Future<void> _loadLyrics(String songId) async {
    if (_lyricsData != null || _loadingLyrics) return;
    if (mounted) setState(() => _loadingLyrics = true);
    try {
      final data = await Api.get('/songs/$songId/lyrics');
      if (mounted) setState(() { _lyricsData = data; _loadingLyrics = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingLyrics = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    final isTablet = MediaQuery.of(context).size.shortestSide >= 600;

    return Scaffold(
      backgroundColor: kBgBase,
      body: ListenableBuilder(
        listenable: widget.player,
        builder: (context, _) {
          final song = widget.player.current;
          if (song == null) return const Center(child: Text('No track', style: TextStyle(color: kTextPrimary)));

          if (isTablet && isLandscape) {
            return _buildLandscapeLayout(context, song);
          }
          return _buildPortraitLayout(context, song);
        },
      ),
    );
  }

  // ── Landscape / tablet layout ─────────────────────────────────────────────
  Widget _buildLandscapeLayout(BuildContext context, dynamic song) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1A2A1A), kBgBase],
        ),
      ),
      child: SafeArea(
        child: Row(children: [
          // Left: album art
          Expanded(
            flex: 5,
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: song.coverUrl != null
                  ? Image.network(song.coverUrl!, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _artPlaceholder())
                  : _artPlaceholder(),
              ),
            ),
          ),

          // Right: controls
          Expanded(
            flex: 6,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(0, 24, 32, 24),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Top bar
                Row(children: [
                  IconButton(
                    icon: const Icon(Icons.keyboard_arrow_down, size: 28, color: kTextPrimary),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('PLAYING FROM PLAYLIST', style: TextStyle(color: kTextSecond, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
                    Text(song.albumName ?? 'Music', style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ])),
                  IconButton(icon: const Icon(Icons.more_vert, color: kTextPrimary), onPressed: () {}),
                ]),

                const Spacer(),

                // Song info
                Text(song.title, style: const TextStyle(color: kTextPrimary, fontSize: 26, fontWeight: FontWeight.w900), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text(song.artist ?? 'Unknown artist', style: const TextStyle(color: kTextSecond, fontSize: 15)),

                const SizedBox(height: 24),

                // Progress
                _buildProgress(context),

                const SizedBox(height: 16),

                // Controls
                _buildControls(context),

                const SizedBox(height: 16),

                // Bottom actions
                _buildBottomActions(context, song),

                const Spacer(),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  // ── Portrait layout ───────────────────────────────────────────────────────
  Widget _buildPortraitLayout(BuildContext context, dynamic song) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF3A1010), kBgBase],
          stops: [0.0, 0.5],
        ),
      ),
      child: Column(children: [
            // ── Status bar ────────────────────────────────────────────────
            _StatusBar(),

            // ── Offline banner ────────────────────────────────────────────
            if (_isOffline)
              Container(
                width: double.infinity,
                color: kAccent.withOpacity(0.15),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(children: [
                  const Icon(Icons.airplanemode_active, color: kAccent, size: 14),
                  const SizedBox(width: 6),
                  const Text('Listening offline • No internet needed',
                    style: TextStyle(color: kAccent, fontSize: 11, fontWeight: FontWeight.w600)),
                ]),
              ),

            // ── Top bar with tabs ─────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(children: [
                IconButton(
                  icon: const Icon(Icons.keyboard_arrow_down, size: 32, color: kTextPrimary),
                  onPressed: () => Navigator.pop(context),
                ),
                Expanded(child: TabBar(
                  controller: _tabCtrl,
                  labelColor: kTextPrimary,
                  unselectedLabelColor: kTextSecond,
                  indicatorColor: kTextPrimary,
                  indicatorSize: TabBarIndicatorSize.label,
                  labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  tabs: const [Tab(text: 'Song'), Tab(text: 'Video')],
                )),
                IconButton(icon: const Icon(Icons.cast, color: kTextPrimary, size: 22), onPressed: () {}),
                IconButton(icon: const Icon(Icons.more_vert, color: kTextPrimary), onPressed: () {}),
              ]),
            ),

            // ── Album art ─────────────────────────────────────────────────
            Expanded(
              flex: _showLyrics ? 0 : 5,
              child: _showLyrics ? const SizedBox.shrink() : Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 8),
                child: AspectRatio(
                  aspectRatio: 1,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: song.coverUrl != null
                      ? Image.network(song.coverUrl!, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _greenArt())
                      : _greenArt(),
                  ),
                ),
              ),
            ),

            // ── Lyrics panel ──────────────────────────────────────────────
            if (_showLyrics)
              Expanded(
                flex: 5,
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFB71C1C),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('Lyrics', style: TextStyle(color: kTextPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
                      IconButton(icon: const Icon(Icons.close, color: kTextPrimary, size: 20),
                        onPressed: () => setState(() => _showLyrics = false)),
                    ]),
                    Expanded(child: SingleChildScrollView(
                      child: Text(
                        _lyricsData?['lyrics'] ?? 'Lyrics not available.',
                        style: const TextStyle(color: kTextPrimary, fontSize: 20, fontWeight: FontWeight.w800, height: 1.6),
                      ),
                    )),
                  ]),
                ),
              ),

            // ── Song info ─────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 8, 28, 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(song.title,
                  style: const TextStyle(color: kTextPrimary, fontSize: 22, fontWeight: FontWeight.w800),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(song.artist ?? 'Unknown artist',
                  style: const TextStyle(color: kTextSecond, fontSize: 14),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              ]),
            ),

            // ── Action row: like / dislike / comments / save ──────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 4),
              child: Row(children: [
                _ActionBtn(
                  icon: Icons.thumb_up_outlined,
                  activeIcon: Icons.thumb_up,
                  label: _fmtCount(_stats?['likes'] ?? 0),
                  active: _stats?['userLike'] == 'like',
                  onTap: () => _toggleLike('like'),
                ),
                const SizedBox(width: 8),
                _ActionBtn(
                  icon: Icons.thumb_down_outlined,
                  activeIcon: Icons.thumb_down,
                  label: '',
                  active: _stats?['userLike'] == 'dislike',
                  onTap: () => _toggleLike('dislike'),
                ),
                const SizedBox(width: 8),
                _ActionBtn(
                  icon: Icons.comment_outlined,
                  activeIcon: Icons.comment,
                  label: _fmtCount(_stats?['comments'] ?? 0),
                  active: _showComments,
                  onTap: () {
                    setState(() { _showComments = !_showComments; _bottomTab = 1; });
                    if (_showComments) _loadComments();
                  },
                ),
                const SizedBox(width: 8),
                _ActionBtn(
                  icon: Icons.bookmark_border,
                  activeIcon: Icons.bookmark,
                  label: 'Save',
                  active: _stats?['isSaved'] == true,
                  onTap: _toggleSave,
                ),
              ]),
            ),

            // ── Comments panel ────────────────────────────────────────────
            if (_showComments)
              Expanded(
                flex: 4,
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                  decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(12)),
                  child: Column(children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        Text('${_stats?['comments'] ?? 0} comentarios',
                          style: const TextStyle(color: kTextPrimary, fontSize: 14, fontWeight: FontWeight.w700)),
                        IconButton(icon: const Icon(Icons.close, color: kTextMuted, size: 18),
                          onPressed: () => setState(() => _showComments = false),
                          padding: EdgeInsets.zero, constraints: const BoxConstraints()),
                      ]),
                    ),
                    Expanded(child: _comments.isEmpty
                      ? const Center(child: Text('Nenhum comentario ainda', style: TextStyle(color: kTextMuted)))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          itemCount: _comments.length,
                          itemBuilder: (ctx, i) {
                            final c = _comments[i];
                            final user = c['user'] as Map?;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                CircleAvatar(radius: 16, backgroundColor: kAccent,
                                  child: Text((user?['name'] ?? user?['email'] ?? '?')[0].toUpperCase(),
                                    style: const TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w800))),
                                const SizedBox(width: 8),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(user?['name'] ?? user?['email'] ?? 'Usuario',
                                    style: const TextStyle(color: kTextPrimary, fontSize: 12, fontWeight: FontWeight.w700)),
                                  Text(c['text'] ?? '', style: const TextStyle(color: kTextSecond, fontSize: 13)),
                                ])),
                              ]),
                            );
                          },
                        ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                      child: Row(children: [
                        Expanded(child: TextField(
                          controller: _commentCtrl,
                          style: const TextStyle(color: kTextPrimary, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'Adicionar comentario...',
                            hintStyle: const TextStyle(color: kTextMuted, fontSize: 13),
                            filled: true, fillColor: const Color(0xFF2A2A2A),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          ),
                        )),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _sendingComment ? null : _sendComment,
                          child: Container(
                            width: 36, height: 36,
                            decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
                            child: _sendingComment
                              ? const Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                              : const Icon(Icons.send, color: Colors.black, size: 18),
                          ),
                        ),
                      ]),
                    ),
                  ]),
                ),
              ),

            // ── Progress bar ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: _buildProgress(context),
            ),

            // ── Controls ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: _buildControls(context),
            ),

            // ── Bottom tabs: UP NEXT / LYRICS / RELATED ───────────────────
            Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A1A),
                borderRadius: BorderRadius.circular(30),
              ),
              child: Row(children: [
                _BottomTab(label: 'UP NEXT', selected: _bottomTab == 0, onTap: () => setState(() => _bottomTab = 0)),
                _BottomTab(label: 'LYRICS', selected: _bottomTab == 1, onTap: () {
                  setState(() { _bottomTab = 1; _showLyrics = true; });
                  _loadLyrics(song.id);
                }),
                _BottomTab(label: 'RELATED', selected: _bottomTab == 2, onTap: () => setState(() => _bottomTab = 2)),
              ]),
            ),

            const SizedBox(height: 8),
          ]),
        );
  }

  String _fmtCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return '$n';
  }

  Widget _greenArt() => Container(
    color: kAccent,
    child: const Icon(Icons.music_note, color: Colors.black, size: 80),
  );

  Widget _artPlaceholder() => Container(
    color: const Color(0xFF2A2A2A),
    child: const Icon(Icons.music_note, size: 80, color: kTextMuted),
  );

  Widget _buildProgress(BuildContext context) {
    return Column(children: [
      SliderTheme(
        data: SliderTheme.of(context).copyWith(
          activeTrackColor: kAccent,
          inactiveTrackColor: const Color(0xFF4A4A4A),
          thumbColor: kTextPrimary,
          thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
          trackHeight: 4,
          overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
        ),
        child: Slider(value: widget.player.progress.clamp(0.0, 1.0), onChanged: widget.player.seek),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(_fmt(widget.player.position), style: const TextStyle(color: kTextMuted, fontSize: 11)),
          Text(_fmt(widget.player.duration), style: const TextStyle(color: kTextMuted, fontSize: 11)),
        ]),
      ),
    ]);
  }

  Widget _buildControls(BuildContext context) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      IconButton(icon: Icon(Icons.shuffle, color: widget.player.shuffle ? kAccent : kTextSecond, size: 22), onPressed: widget.player.toggleShuffle),
      IconButton(icon: const Icon(Icons.skip_previous, color: kTextPrimary, size: 40), onPressed: widget.player.skipPrev),
      GestureDetector(
        onTap: widget.player.togglePlay,
        child: Container(
          width: 64, height: 64,
          decoration: const BoxDecoration(color: kTextPrimary, shape: BoxShape.circle),
          child: Icon(widget.player.playing ? Icons.pause : Icons.play_arrow, color: Colors.black, size: 38),
        ),
      ),
      IconButton(icon: const Icon(Icons.skip_next, color: kTextPrimary, size: 40), onPressed: widget.player.skipNext),
      IconButton(
        icon: Icon(widget.player.repeat == LoopMode.one ? Icons.repeat_one : Icons.repeat,
          color: widget.player.repeat != LoopMode.off ? kAccent : kTextSecond, size: 22),
        onPressed: widget.player.cycleRepeat,
      ),
    ]);
  }

  Widget _buildBottomActions(BuildContext context, dynamic song) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      IconButton(icon: const Icon(Icons.devices_other, color: kTextSecond, size: 20), onPressed: () {}),
      Row(children: [
        const Icon(Icons.volume_down, color: kTextSecond, size: 18),
        SizedBox(width: 80, child: SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: kTextSecond,
            inactiveTrackColor: const Color(0xFF4A4A4A),
            thumbColor: kTextPrimary,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
            trackHeight: 3,
          ),
          child: Slider(value: widget.player.volume, onChanged: widget.player.setVolume),
        )),
        const Icon(Icons.volume_up, color: kTextSecond, size: 18),
      ]),
      IconButton(
        icon: Icon(Icons.lyrics_outlined, color: _showLyrics ? kAccent : kTextSecond, size: 20),
        onPressed: () {
          setState(() => _showLyrics = !_showLyrics);
          if (_showLyrics && song != null) _loadLyrics(song.id);
        },
      ),
      IconButton(icon: const Icon(Icons.queue_music, color: kTextSecond, size: 20), onPressed: () {}),
    ]);
  }

  String _fmt(Duration d) {
    final m = d.inMinutes, s = d.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}

// ── Status bar ────────────────────────────────────────────────────────────────
class _StatusBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
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
}

// ── Action button (like/dislike/comments/save) ────────────────────────────────
class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final IconData? activeIcon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, this.activeIcon, required this.label, this.active = false, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: active ? kAccent.withOpacity(0.2) : const Color(0xFF2A2A2A),
          borderRadius: BorderRadius.circular(20),
          border: active ? Border.all(color: kAccent.withOpacity(0.5)) : null,
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(active && activeIcon != null ? activeIcon! : icon,
            color: active ? kAccent : kTextPrimary, size: 18),
          if (label.isNotEmpty) ...[
            const SizedBox(width: 6),
            Text(label, style: TextStyle(
              color: active ? kAccent : kTextPrimary,
              fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ]),
      ),
    );
  }
}

// ── Bottom tab (UP NEXT / LYRICS / RELATED) ───────────────────────────────────
class _BottomTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _BottomTab({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFF3A3A3A) : Colors.transparent,
            borderRadius: BorderRadius.circular(30),
          ),
          child: Text(label, textAlign: TextAlign.center,
            style: TextStyle(
              color: selected ? kTextPrimary : kTextSecond,
              fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        ),
      ),
    );
  }
}
