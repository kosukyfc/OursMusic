import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';

// ── Admin Screen ──────────────────────────────────────────────────────────────
class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});
  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: kBgBase,
        appBar: AppBar(
          backgroundColor: const Color(0xFF0A0A0A),
          title: const Row(children: [
            Icon(Icons.shield, color: Color(0xFFF59E0B), size: 20),
            SizedBox(width: 8),
            Text('Painel Admin',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          ]),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
          bottom: const TabBar(
            isScrollable: true,
            labelColor: kAccent,
            unselectedLabelColor: kTextMuted,
            indicatorColor: kAccent,
            tabs: [
              Tab(text: 'Dashboard'),
              Tab(text: 'Usuários'),
              Tab(text: 'Músicas'),
              Tab(text: 'Atividades'),
            ],
          ),
        ),
        body: const TabBarView(children: [
          _AdminDashboard(),
          _AdminUsers(),
          _AdminSongs(),
          _AdminActivity(),
        ]),
      ),
    );
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
class _AdminDashboard extends StatefulWidget {
  const _AdminDashboard();
  @override
  State<_AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<_AdminDashboard> {
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await Api.get('/admin/stats');
      if (data is Map<String, dynamic> && mounted) {
        setState(() { _stats = data; _loading = false; });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: kAccent));
    if (_stats == null) return const Center(child: Text('Erro ao carregar', style: TextStyle(color: kTextMuted)));

    return RefreshIndicator(
      onRefresh: _load,
      color: kAccent,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _StatCard(icon: Icons.music_note, label: 'Músicas', value: '${_stats!['totalSongs'] ?? 0}', color: kAccent),
          const SizedBox(height: 12),
          _StatCard(icon: Icons.people, label: 'Usuários', value: '${_stats!['totalUsers'] ?? 0}', color: const Color(0xFF60A5FA)),
          const SizedBox(height: 12),
          _StatCard(icon: Icons.queue_music, label: 'Playlists', value: '${_stats!['totalPlaylists'] ?? 0}', color: const Color(0xFFA78BFA)),
          const SizedBox(height: 12),
          _StatCard(icon: Icons.play_circle_outline, label: 'Atividades', value: '${_stats!['recentActivity'] ?? 0}', color: const Color(0xFFFBBF24)),
          const SizedBox(height: 20),
          if (_stats!['planBreakdown'] is List) ...[
            const Text('Distribuição de planos',
                style: TextStyle(color: kTextPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            ...(_stats!['planBreakdown'] as List).map((p) {
              final plan = p['plan']?.toString() ?? '';
              final count = p['_count']?['plan'] ?? 0;
              final colors = {'free': kTextMuted, 'premium': kAccent, 'family': const Color(0xFFA78BFA)};
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: colors[plan] ?? kTextMuted, shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Text(plan.toUpperCase(), style: TextStyle(color: colors[plan] ?? kTextMuted, fontSize: 13, fontWeight: FontWeight.w700)),
                  const Spacer(),
                  Text('$count', style: const TextStyle(color: kTextPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                ]),
              );
            }),
          ],
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color color;
  const _StatCard({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: const Color(0xFF1A1A1A),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.2)),
    ),
    child: Row(children: [
      Container(
        width: 44, height: 44,
        decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: color, size: 22),
      ),
      const SizedBox(width: 14),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(color: kTextMuted, fontSize: 12)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
      ]),
    ]),
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
class _AdminUsers extends StatefulWidget {
  const _AdminUsers();
  @override
  State<_AdminUsers> createState() => _AdminUsersState();
}

class _AdminUsersState extends State<_AdminUsers> {
  List<dynamic> _users = [];
  bool _loading = true;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load([String q = '']) async {
    setState(() => _loading = true);
    try {
      final path = q.isEmpty ? '/admin/users' : '/admin/users?q=${Uri.encodeComponent(q)}';
      final data = await Api.get(path);
      if (data is List && mounted) setState(() { _users = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleAdmin(String id, bool current) async {
    try {
      await Api.put('/admin/users/$id/admin', {'isAdmin': !current});
      _load(_search.text);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    }
  }

  Future<void> _setPlan(String id, String plan) async {
    try {
      await Api.put('/admin/users/$id/plan', {'plan': plan, 'durationDays': -1});
      _load(_search.text);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: TextField(
          controller: _search,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Buscar usuário...',
            hintStyle: const TextStyle(color: kTextMuted),
            prefixIcon: const Icon(Icons.search, color: kTextMuted),
            filled: true,
            fillColor: const Color(0xFF1A1A1A),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          ),
          onChanged: (v) => _load(v),
        ),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: kAccent))
            : RefreshIndicator(
                onRefresh: () => _load(_search.text),
                color: kAccent,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _users.length,
                  itemBuilder: (_, i) {
                    final u = _users[i] as Map<String, dynamic>;
                    final isAdmin = u['isAdmin'] as bool? ?? false;
                    final plan = u['plan']?.toString() ?? 'free';
                    final name = u['name']?.toString() ?? u['email']?.toString().split('@')[0] ?? '?';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1A1A1A),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: kAccent.withValues(alpha: 0.2),
                            child: Text(name[0].toUpperCase(), style: const TextStyle(color: kAccent, fontWeight: FontWeight.w800)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(name, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                            Text(u['email']?.toString() ?? '', style: const TextStyle(color: kTextMuted, fontSize: 11)),
                          ])),
                          _PlanBadge(plan: plan),
                        ]),
                        const SizedBox(height: 10),
                        Row(children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => _toggleAdmin(u['id'].toString(), isAdmin),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                decoration: BoxDecoration(
                                  color: isAdmin ? const Color(0xFFF59E0B).withValues(alpha: 0.15) : const Color(0xFF2A2A2A),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: isAdmin ? const Color(0xFFF59E0B) : Colors.transparent),
                                ),
                                child: Text(isAdmin ? '🛡️ Admin' : 'Admin',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: isAdmin ? const Color(0xFFF59E0B) : kTextMuted, fontSize: 12, fontWeight: FontWeight.w700)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: PopupMenuButton<String>(
                              color: const Color(0xFF2A2A2A),
                              onSelected: (p) => _setPlan(u['id'].toString(), p),
                              itemBuilder: (_) => ['free', 'premium', 'family'].map((p) =>
                                PopupMenuItem(value: p, child: Text(p, style: const TextStyle(color: Colors.white)))).toList(),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                decoration: BoxDecoration(color: const Color(0xFF2A2A2A), borderRadius: BorderRadius.circular(6)),
                                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                  Text('Plano: $plan', style: const TextStyle(color: kTextPrimary, fontSize: 12)),
                                  const Icon(Icons.arrow_drop_down, color: kTextMuted, size: 16),
                                ]),
                              ),
                            ),
                          ),
                        ]),
                      ]),
                    );
                  },
                ),
              ),
      ),
    ]);
  }
}

class _PlanBadge extends StatelessWidget {
  final String plan;
  const _PlanBadge({required this.plan});
  @override
  Widget build(BuildContext context) {
    final colors = {'free': kTextMuted, 'premium': kAccent, 'family': const Color(0xFFA78BFA)};
    final color = colors[plan] ?? kTextMuted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(6), border: Border.all(color: color.withValues(alpha: 0.4))),
      child: Text(plan.toUpperCase(), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800)),
    );
  }
}

// ── Songs ─────────────────────────────────────────────────────────────────────
class _AdminSongs extends StatefulWidget {
  const _AdminSongs();
  @override
  State<_AdminSongs> createState() => _AdminSongsState();
}

class _AdminSongsState extends State<_AdminSongs> {
  List<dynamic> _songs = [];
  bool _loading = true;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load([String q = '']) async {
    setState(() => _loading = true);
    try {
      final path = q.isEmpty ? '/admin/songs' : '/admin/songs?q=${Uri.encodeComponent(q)}';
      final data = await Api.get(path);
      if (data is List && mounted) setState(() { _songs = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: TextField(
          controller: _search,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Buscar música...',
            hintStyle: const TextStyle(color: kTextMuted),
            prefixIcon: const Icon(Icons.search, color: kTextMuted),
            filled: true,
            fillColor: const Color(0xFF1A1A1A),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          ),
          onChanged: (v) => _load(v),
        ),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: kAccent))
            : RefreshIndicator(
                onRefresh: () => _load(_search.text),
                color: kAccent,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _songs.length,
                  itemBuilder: (_, i) {
                    final s = _songs[i] as Map<String, dynamic>;
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: s['coverUrl'] != null
                            ? Image.network(s['coverUrl'], width: 44, height: 44, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _songPlaceholder())
                            : _songPlaceholder(),
                      ),
                      title: Text(s['title']?.toString() ?? '—', style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text('${s['artist'] ?? '—'} · ${s['playCount'] ?? 0} plays', style: const TextStyle(color: kTextMuted, fontSize: 12)),
                      trailing: s['available'] == true
                          ? const Icon(Icons.check_circle, color: kAccent, size: 18)
                          : const Icon(Icons.cancel_outlined, color: kTextMuted, size: 18),
                    );
                  },
                ),
              ),
      ),
    ]);
  }

  Widget _songPlaceholder() => Container(width: 44, height: 44, color: const Color(0xFF2A2A2A), child: const Icon(Icons.music_note, color: kTextMuted, size: 20));
}

// ── Activity ──────────────────────────────────────────────────────────────────
class _AdminActivity extends StatefulWidget {
  const _AdminActivity();
  @override
  State<_AdminActivity> createState() => _AdminActivityState();
}

class _AdminActivityState extends State<_AdminActivity> {
  List<dynamic> _users = [];
  bool _loading = true;
  Map<String, dynamic>? _selectedUser;
  List<dynamic> _logs = [];
  bool _loadingLogs = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await Api.get('/admin/activity/users');
      if (data is List && mounted) setState(() { _users = data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openUser(Map<String, dynamic> u) async {
    setState(() { _selectedUser = u; _loadingLogs = true; });
    try {
      final data = await Api.get('/admin/activity/users/${u['id']}?limit=100');
      if (data is List && mounted) setState(() { _logs = data; _loadingLogs = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingLogs = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedUser != null) {
      final displayName = _selectedUser!['username'] != null
          ? '@${_selectedUser!['username']}'
          : (_selectedUser!['name'] ?? _selectedUser!['email'] ?? '?');
      return Column(children: [
        Container(
          color: const Color(0xFF0A0A0A),
          child: ListTile(
            leading: IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => setState(() { _selectedUser = null; _logs = []; })),
            title: Text(displayName.toString(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            subtitle: Text('${_selectedUser!['totalLogs'] ?? 0} atividades', style: const TextStyle(color: kTextMuted, fontSize: 12)),
          ),
        ),
        Expanded(
          child: _loadingLogs
              ? const Center(child: CircularProgressIndicator(color: kAccent))
              : _logs.isEmpty
                  ? const Center(child: Text('Nenhuma atividade', style: TextStyle(color: kTextMuted)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _logs.length,
                      itemBuilder: (_, i) {
                        final log = _logs[i] as Map<String, dynamic>;
                        final action = log['action']?.toString() ?? '';
                        final songTitle = log['song']?['title']?.toString() ?? '—';
                        final ts = log['timestamp'] != null ? DateTime.tryParse(log['timestamp'].toString()) : null;
                        final actionColors = {'play': kAccent, 'download': const Color(0xFF60A5FA), 'like': const Color(0xFFF43F5E), 'skip': kTextMuted};
                        final color = actionColors[action] ?? kTextMuted;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
                            child: Icon(_actionIcon(action), color: color, size: 18),
                          ),
                          title: Text(songTitle, style: const TextStyle(color: Colors.white, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text(action, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
                          trailing: ts != null
                              ? Text(
                                  '${ts.day.toString().padLeft(2,'0')}/${ts.month.toString().padLeft(2,'0')} ${ts.hour.toString().padLeft(2,'0')}:${ts.minute.toString().padLeft(2,'0')}',
                                  style: const TextStyle(color: kTextMuted, fontSize: 11))
                              : null,
                        );
                      },
                    ),
        ),
      ]);
    }

    return _loading
        ? const Center(child: CircularProgressIndicator(color: kAccent))
        : RefreshIndicator(
            onRefresh: _load,
            color: kAccent,
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _users.length,
              itemBuilder: (_, i) {
                final u = _users[i] as Map<String, dynamic>;
                final displayName = u['username'] != null ? '@${u['username']}' : (u['name'] ?? u['email'] ?? '?');
                final last = u['lastActivity'] as Map<String, dynamic>?;
                return GestureDetector(
                  onTap: () => _openUser(u),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(10)),
                    child: Row(children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundImage: u['avatarUrl'] != null ? NetworkImage(u['avatarUrl'].toString()) : null,
                        backgroundColor: kAccent.withValues(alpha: 0.2),
                        child: u['avatarUrl'] == null ? Text(displayName.toString()[0].toUpperCase(), style: const TextStyle(color: kAccent, fontWeight: FontWeight.w800)) : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(displayName.toString(), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                        Text('${u['totalLogs'] ?? 0} atividades', style: const TextStyle(color: kTextMuted, fontSize: 12)),
                        if (last != null) Text(
                          '${last['action']} · ${last['song']?['title'] ?? '—'}',
                          style: const TextStyle(color: kTextSecond, fontSize: 11),
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                        ),
                      ])),
                      const Icon(Icons.chevron_right, color: kTextMuted),
                    ]),
                  ),
                );
              },
            ),
          );
  }

  IconData _actionIcon(String action) {
    switch (action) {
      case 'play': return Icons.play_arrow;
      case 'download': return Icons.download;
      case 'like': return Icons.favorite;
      case 'skip': return Icons.skip_next;
      case 'add_to_playlist': return Icons.playlist_add;
      default: return Icons.circle;
    }
  }
}
