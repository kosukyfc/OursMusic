import 'package:flutter/material.dart';
import '../api.dart';
import '../theme.dart';
import '../widgets/avatar_edit_sheet.dart';
import '../widgets/premium_avatar.dart';
import '../services/theme_service.dart';
import '../services/update_service.dart';

class ProfileScreen extends StatefulWidget {
  final VoidCallback onLogout;
  const ProfileScreen({super.key, required this.onLogout});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await Api.get('/social/profile/me');
      if (data is Map<String, dynamic> && mounted) {
        setState(() { _profile = data; _loading = false; });
      } else {
        if (mounted) setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _editAvatar() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AvatarEditSheet(
        currentUrl: _profile?['avatarUrl'],
        onSaved: (url) => setState(() => _profile = {...?_profile, 'avatarUrl': url}),
      ),
    );
  }

  bool get _isPremium => _profile?['plan'] == 'premium' || _profile?['plan'] == 'family';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgBase,
      body: _loading
        ? const Center(child: CircularProgressIndicator(color: kAccent))
        : CustomScrollView(slivers: [
            // App bar with gradient
            SliverAppBar(
              expandedHeight: 180,
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
                      colors: [kAccent.withOpacity(0.25), kBgBase],
                    ),
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                // Avatar + edit + plan button
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  GestureDetector(
                    onTap: _editAvatar,
                    child: Stack(children: [
                      PremiumAvatar(
                        name: _profile?['name'] ?? _profile?['email'] ?? '?',
                        plan: _profile?['plan'] ?? 'free',
                        avatarUrl: _profile?['avatarUrl'],
                        playing: false,
                        size: 96,
                      ),
                      Positioned(bottom: 4, right: 4,
                        child: Container(
                          width: 26, height: 26,
                          decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
                          child: const Icon(Icons.edit, color: Colors.black, size: 14),
                        ),
                      ),
                    ]),
                  ),
                  OutlinedButton(
                    onPressed: () => _showEditProfile(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: kTextPrimary,
                      side: const BorderSide(color: kTextPrimary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    ),
                    child: const Text('Editar perfil', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ]),

                const SizedBox(height: 14),

                // Name + username
                Text(
                  _profile?['name'] ?? _profile?['email']?.split('@')[0] ?? 'Usuario',
                  style: const TextStyle(color: kTextPrimary, fontSize: 24, fontWeight: FontWeight.w900),
                ),
                if (_profile?['username'] != null)
                  Text('@${_profile!['username']}', style: const TextStyle(color: kTextSecond, fontSize: 14)),

                // Premium badge
                if (_isPremium) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF1DB954), Color(0xFF0D7A3A)]),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.star, color: Colors.black, size: 12),
                      const SizedBox(width: 4),
                      Text(
                        _profile!['plan'] == 'family' ? 'Family' : 'Premium',
                        style: const TextStyle(color: Colors.black, fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                    ]),
                  ),
                ],

                if (_profile?['bio'] != null && (_profile!['bio'] as String).isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(_profile!['bio'], style: const TextStyle(color: kTextSecond, fontSize: 14, height: 1.4)),
                ],

                const SizedBox(height: 14),

                // Stats
                Row(children: [
                  _Stat(count: _profile?['followersCount'] ?? 0, label: 'seguidores'),
                  const SizedBox(width: 24),
                  _Stat(count: _profile?['followingCount'] ?? 0, label: 'seguindo'),
                ]),

                const SizedBox(height: 28),
                const Divider(color: Color(0xFF2A2A2A)),

                // ── Atualizar plano ──────────────────────────────────────
                if (!_isPremium) ...[
                  const SizedBox(height: 8),
                  _SectionTitle('Plano'),
                  _PlanCard(onTap: () => _showPlanSheet()),
                  const SizedBox(height: 8),
                  const Divider(color: Color(0xFF2A2A2A)),
                ],

                // ── Configuracoes ────────────────────────────────────────
                const SizedBox(height: 8),
                _SectionTitle('Configuracoes'),
                _MenuItem(icon: Icons.person_outline, label: 'Conta', subtitle: _profile?['email'] ?? '', onTap: () => _showAccountSheet()),
                _MenuItem(icon: Icons.notifications_outlined, label: 'Notificacoes', onTap: () => _showNotifSheet()),
                _MenuItem(icon: Icons.privacy_tip_outlined, label: 'Privacidade', onTap: () => _showPrivacySheet()),
                _MenuItem(icon: Icons.palette_outlined, label: 'Tema', subtitle: themeService.current.name, onTap: () => _showThemeSheet()),
                _MenuItem(icon: Icons.language, label: 'Idioma', subtitle: _langName(themeService.lang), onTap: () => _showLangSheet()),
                _MenuItem(icon: Icons.music_note_outlined, label: 'Qualidade de audio', subtitle: 'Alta', onTap: () => _showAudioSheet()),
                _MenuItem(icon: Icons.download_outlined, label: 'Downloads', subtitle: _isPremium ? 'Ativado' : 'Apenas premium', onTap: _isPremium ? () {} : null),
                _MenuItem(icon: Icons.devices_outlined, label: 'Dispositivos conectados', onTap: () {}),

                const SizedBox(height: 8),
                const Divider(color: Color(0xFF2A2A2A)),

                // ── Suporte ──────────────────────────────────────────────
                const SizedBox(height: 8),
                _SectionTitle('Suporte'),
                _MenuItem(icon: Icons.help_outline, label: 'Central de ajuda', onTap: () => _showHelpSheet()),
                _MenuItem(icon: Icons.bug_report_outlined, label: 'Reportar problema', onTap: () => _showReportSheet()),
                _MenuItem(icon: Icons.info_outline, label: 'Sobre o OursMusic', onTap: () => _showAboutSheet()),
        _MenuItem(icon: Icons.system_update_outlined, label: 'Atualizar', onTap: () => _showUpdateSheet()),

                const SizedBox(height: 8),
                const Divider(color: Color(0xFF2A2A2A)),
                const SizedBox(height: 8),

                // ── Sair ─────────────────────────────────────────────────
                _MenuItem(
                  icon: Icons.logout,
                  label: 'Sair',
                  color: const Color(0xFFF15E6C),
                  onTap: () {
                    Api.clearToken();
                    widget.onLogout();
                  },
                ),
                const SizedBox(height: 32),
              ]),
            )),
          ]),
    );
  }

  void _showEditProfile() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _EditProfileSheet(profile: _profile, onSaved: (updated) {
        setState(() => _profile = {...?_profile, ...updated});
      }),
    );
  }

  void _showPlanSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _PlanSheet(),
    );
  }

  void _showAccountSheet() {
    _showInfoSheet('Conta', [
      _InfoItem('Email', _profile?['email'] ?? ''),
      _InfoItem('Plano', _profile?['plan'] ?? 'free'),
      _InfoItem('Membro desde', _profile?['createdAt'] != null
        ? DateTime.parse(_profile!['createdAt']).toLocal().toString().split(' ')[0] : ''),
    ]);
  }

  void _showNotifSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _ToggleSheet(title: 'Notificacoes', items: const [
        {'label': 'Novas musicas de artistas seguidos', 'key': 'new_music'},
        {'label': 'Recomendacoes personalizadas', 'key': 'recommendations'},
        {'label': 'Atualizacoes do app', 'key': 'app_updates'},
        {'label': 'Novidades e ofertas', 'key': 'offers'},
      ]),
    );
  }

  void _showPrivacySheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _ToggleSheet(title: 'Privacidade', items: const [
        {'label': 'Perfil privado', 'key': 'private'},
        {'label': 'Mostrar atividade recente', 'key': 'activity'},
        {'label': 'Permitir seguir', 'key': 'follow'},
      ]),
    );
  }

  void _showAudioSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _RadioSheet(title: 'Qualidade de audio', options: const ['Automatica', 'Baixa', 'Normal', 'Alta', 'Muito alta'], selected: 'Alta'),
    );
  }

  String _langName(String lang) {
    const names = {'pt': 'Portugues (Brasil)', 'en': 'English', 'es': 'Espanol', 'ru': 'Русский'};
    return names[lang] ?? 'Portugues (Brasil)';
  }

  void _showThemeSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => SafeArea(child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            _SheetHandle(),
            const SizedBox(height: 16),
            const Text('Tema', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4, childAspectRatio: 0.9, crossAxisSpacing: 8, mainAxisSpacing: 8,
              ),
              itemCount: kThemes.length,
              itemBuilder: (ctx, i) {
                final theme = kThemes[i];
                final selected = themeService.current.id == theme.id;
                return GestureDetector(
                  onTap: () async {
                    await themeService.setTheme(theme);
                    setS(() {});
                    setState(() {});
                  },
                  child: Column(children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 52, height: 52,
                      decoration: BoxDecoration(
                        color: theme.bgBase,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: selected ? theme.accent : const Color(0xFF3A3A3A),
                          width: selected ? 3 : 1,
                        ),
                        boxShadow: selected ? [BoxShadow(color: theme.accent.withOpacity(0.5), blurRadius: 8)] : null,
                      ),
                      child: Center(child: Container(
                        width: 24, height: 24,
                        decoration: BoxDecoration(color: theme.accent, shape: BoxShape.circle),
                      )),
                    ),
                    const SizedBox(height: 4),
                    Text(theme.name, style: TextStyle(
                      color: selected ? theme.accent : kTextSecond,
                      fontSize: 10, fontWeight: selected ? FontWeight.w700 : FontWeight.w400),
                      textAlign: TextAlign.center),
                  ]),
                );
              },
            ),
          ]),
        )),
      ),
    );
  }

  void _showLangSheet() {
    const langs = [
      {'id': 'pt', 'name': 'Portugues (Brasil)', 'flag': '🇧🇷'},
      {'id': 'en', 'name': 'English', 'flag': '🇺🇸'},
      {'id': 'es', 'name': 'Espanol', 'flag': '🇪🇸'},
      {'id': 'ru', 'name': 'Русский', 'flag': '🇷🇺'},
    ];
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => SafeArea(child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            _SheetHandle(),
            const SizedBox(height: 16),
            const Text('Idioma', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            ...langs.map((lang) {
              final selected = themeService.lang == lang['id'];
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Text(lang['flag']!, style: const TextStyle(fontSize: 24)),
                title: Text(lang['name']!, style: TextStyle(
                  color: selected ? kAccent : kTextPrimary,
                  fontSize: 15, fontWeight: selected ? FontWeight.w700 : FontWeight.w400)),
                trailing: selected ? const Icon(Icons.check, color: kAccent) : null,
                onTap: () async {
                  await themeService.setLang(lang['id']!);
                  setS(() {});
                  setState(() {});
                },
              );
            }),
          ]),
        )),
      ),
    );
  }

  void _showHelpSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _HelpSheet(),
    );
  }

  void _showReportSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _ReportSheet(),
    );
  }

  void _showUpdateSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _UpdateSheet(),
    );
  }

  void _showAboutSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => const _AboutSheet(),
    );
  }

  void _showInfoSheet(String title, List<_InfoItem> items) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF282828),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          _SheetHandle(),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          ...items.map((i) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(i.label, style: const TextStyle(color: kTextSecond, fontSize: 14)),
              Text(i.value, style: const TextStyle(color: kTextPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
            ]),
          )),
        ]),
      )),
    );
  }
}

class _InfoItem { final String label, value; const _InfoItem(this.label, this.value); }

// ── Helpers ───────────────────────────────────────────────────────────────────
class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Text(text, style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1)),
  );
}

class _Stat extends StatelessWidget {
  final int count;
  final String label;
  const _Stat({required this.count, required this.label});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text('$count', style: const TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
    Text(label, style: const TextStyle(color: kTextSecond, fontSize: 12)),
  ]);
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final VoidCallback? onTap;
  final Color? color;
  const _MenuItem({required this.icon, required this.label, this.subtitle, this.onTap, this.color});
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon, color: color ?? kTextSecond, size: 22),
    title: Text(label, style: TextStyle(color: color ?? kTextPrimary, fontSize: 15)),
    subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(color: kTextMuted, fontSize: 12)) : null,
    trailing: onTap != null && color == null ? const Icon(Icons.chevron_right, color: kTextMuted) : null,
    onTap: onTap,
    enabled: onTap != null,
  );
}

class _SheetHandle extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Center(child: Container(
    width: 40, height: 4,
    decoration: BoxDecoration(color: const Color(0xFF535353), borderRadius: BorderRadius.circular(2)),
  ));
}

// ── Plan card ─────────────────────────────────────────────────────────────────
class _PlanCard extends StatelessWidget {
  final VoidCallback onTap;
  const _PlanCard({required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF1A2A1A), Color(0xFF0D1A0D)]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kAccent.withOpacity(0.4)),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
          child: const Icon(Icons.star, color: Colors.black, size: 24),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Atualizar para o Premium', style: TextStyle(color: kTextPrimary, fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          const Text('Downloads, qualidade alta e sem anuncios', style: TextStyle(color: kTextSecond, fontSize: 12)),
        ])),
        const Icon(Icons.chevron_right, color: kAccent),
      ]),
    ),
  );
}

// ── Plan sheet ────────────────────────────────────────────────────────────────
class _PlanSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) => SafeArea(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      _SheetHandle(),
      const SizedBox(height: 20),
      const Icon(Icons.star, color: kAccent, size: 48),
      const SizedBox(height: 12),
      const Text('OursMusic Premium', style: TextStyle(color: kTextPrimary, fontSize: 22, fontWeight: FontWeight.w900)),
      const SizedBox(height: 8),
      const Text('Aproveite ao maximo sua musica', style: TextStyle(color: kTextSecond, fontSize: 14), textAlign: TextAlign.center),
      const SizedBox(height: 20),
      ...[
        ['Downloads offline', Icons.download_done],
        ['Qualidade de audio muito alta', Icons.high_quality],
        ['Sem anuncios', Icons.block],
        ['Reproducao em qualquer dispositivo', Icons.devices],
        ['Modo offline', Icons.wifi_off],
      ].map((item) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(children: [
          Icon(item[1] as IconData, color: kAccent, size: 20),
          const SizedBox(width: 12),
          Text(item[0] as String, style: const TextStyle(color: kTextPrimary, fontSize: 14)),
        ]),
      )),
      const SizedBox(height: 20),
      const Text('Solicite ao administrador para ativar o Premium na sua conta.', style: TextStyle(color: kTextMuted, fontSize: 12), textAlign: TextAlign.center),
      const SizedBox(height: 8),
    ]),
  ));
}

// ── Edit profile sheet ────────────────────────────────────────────────────────
class _EditProfileSheet extends StatefulWidget {
  final Map<String, dynamic>? profile;
  final void Function(Map<String, dynamic>) onSaved;
  const _EditProfileSheet({required this.profile, required this.onSaved});
  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late TextEditingController _name, _username, _bio;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.profile?['name'] ?? '');
    _username = TextEditingController(text: widget.profile?['username'] ?? '');
    _bio = TextEditingController(text: widget.profile?['bio'] ?? '');
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final data = await Api.post('/social/profile', {
        'name': _name.text.trim(),
        'username': _username.text.trim(),
        'bio': _bio.text.trim(),
      });
      widget.onSaved(data as Map<String, dynamic>);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: SafeArea(child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        _SheetHandle(),
        const SizedBox(height: 16),
        const Text('Editar perfil', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 20),
        _Field(ctrl: _name, label: 'Nome'),
        const SizedBox(height: 12),
        _Field(ctrl: _username, label: '@username'),
        const SizedBox(height: 12),
        _Field(ctrl: _bio, label: 'Bio', maxLines: 3),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _saving ? null : _save,
          style: ElevatedButton.styleFrom(backgroundColor: kAccent, foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500))),
          child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
            : const Text('Salvar', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        )),
      ]),
    )),
  );
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final int maxLines;
  const _Field({required this.ctrl, required this.label, this.maxLines = 1});
  @override
  Widget build(BuildContext context) => TextField(
    controller: ctrl,
    maxLines: maxLines,
    style: const TextStyle(color: kTextPrimary),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: kTextMuted),
      filled: true, fillColor: const Color(0xFF3A3A3A),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
  );
}

// ── Toggle sheet ──────────────────────────────────────────────────────────────
class _ToggleSheet extends StatefulWidget {
  final String title;
  final List<Map<String, String>> items;
  const _ToggleSheet({required this.title, required this.items});
  @override
  State<_ToggleSheet> createState() => _ToggleSheetState();
}

class _ToggleSheetState extends State<_ToggleSheet> {
  final Map<String, bool> _values = {};
  @override
  void initState() {
    super.initState();
    for (final i in widget.items) _values[i['key']!] = true;
  }
  @override
  Widget build(BuildContext context) => SafeArea(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      _SheetHandle(),
      const SizedBox(height: 16),
      Text(widget.title, style: const TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
      const SizedBox(height: 16),
      ...widget.items.map((item) => SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(item['label']!, style: const TextStyle(color: kTextPrimary, fontSize: 14)),
        value: _values[item['key']!] ?? true,
        activeColor: kAccent,
        onChanged: (v) => setState(() => _values[item['key']!] = v),
      )),
    ]),
  ));
}

// ── Radio sheet ───────────────────────────────────────────────────────────────
class _RadioSheet extends StatefulWidget {
  final String title;
  final List<String> options;
  final String selected;
  const _RadioSheet({required this.title, required this.options, required this.selected});
  @override
  State<_RadioSheet> createState() => _RadioSheetState();
}

class _RadioSheetState extends State<_RadioSheet> {
  late String _selected;
  @override
  void initState() { super.initState(); _selected = widget.selected; }
  @override
  Widget build(BuildContext context) => SafeArea(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      _SheetHandle(),
      const SizedBox(height: 16),
      Text(widget.title, style: const TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      ...widget.options.map((opt) => RadioListTile<String>(
        contentPadding: EdgeInsets.zero,
        title: Text(opt, style: const TextStyle(color: kTextPrimary, fontSize: 14)),
        value: opt, groupValue: _selected,
        activeColor: kAccent,
        onChanged: (v) => setState(() => _selected = v!),
      )),
    ]),
  ));
}

// ── Help sheet ────────────────────────────────────────────────────────────────
class _HelpSheet extends StatelessWidget {
  @override
  Widget build(BuildContext context) => SafeArea(child: Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      _SheetHandle(),
      const SizedBox(height: 16),
      const Text('Central de ajuda', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
      const SizedBox(height: 16),
      ...[
        ['Como baixar musicas?', 'Usuarios premium podem baixar tocando no icone de download em qualquer musica.'],
        ['Como funciona o Premium?', 'O Premium e concedido pelo administrador. Inclui downloads, qualidade alta e modo offline.'],
        ['Nao consigo ouvir uma musica', 'Verifique sua conexao. Se o problema persistir, contate o suporte.'],
        ['Como mudar minha foto?', 'Toque no seu avatar na tela de perfil para alterar a foto.'],
      ].map((item) => ExpansionTile(
        tilePadding: EdgeInsets.zero,
        title: Text(item[0], style: const TextStyle(color: kTextPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
        iconColor: kAccent,
        collapsedIconColor: kTextMuted,
        children: [Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(item[1], style: const TextStyle(color: kTextSecond, fontSize: 13, height: 1.5)),
        )],
      )),
    ]),
  ));
}

// ── Report sheet ──────────────────────────────────────────────────────────────
class _ReportSheet extends StatefulWidget {
  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  final _ctrl = TextEditingController();
  String _type = 'Bug';
  bool _sent = false;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: SafeArea(child: Padding(
      padding: const EdgeInsets.all(24),
      child: _sent
        ? Column(mainAxisSize: MainAxisSize.min, children: [
            _SheetHandle(),
            const SizedBox(height: 24),
            const Icon(Icons.check_circle, color: kAccent, size: 48),
            const SizedBox(height: 12),
            const Text('Obrigado pelo feedback!', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Seu relatorio foi enviado.', style: TextStyle(color: kTextSecond, fontSize: 14)),
            const SizedBox(height: 16),
          ])
        : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            _SheetHandle(),
            const SizedBox(height: 16),
            const Text('Reportar problema', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _type,
              dropdownColor: const Color(0xFF3A3A3A),
              style: const TextStyle(color: kTextPrimary),
              decoration: InputDecoration(
                labelText: 'Tipo', labelStyle: const TextStyle(color: kTextMuted),
                filled: true, fillColor: const Color(0xFF3A3A3A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
              ),
              items: ['Bug', 'Musica com problema', 'Problema de audio', 'Sugestao', 'Outro']
                .map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _ctrl,
              maxLines: 4,
              style: const TextStyle(color: kTextPrimary),
              decoration: InputDecoration(
                hintText: 'Descreva o problema...',
                hintStyle: const TextStyle(color: kTextMuted),
                filled: true, fillColor: const Color(0xFF3A3A3A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(width: double.infinity, child: ElevatedButton(
              onPressed: () => setState(() => _sent = true),
              style: ElevatedButton.styleFrom(backgroundColor: kAccent, foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500))),
              child: const Text('Enviar', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            )),
          ]),
    )),
  );
}

// ── About sheet ───────────────────────────────────────────────────────────────
class _AboutSheet extends StatelessWidget {
  const _AboutSheet();
  @override
  Widget build(BuildContext context) {
    const _appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.1');
    return SafeArea(child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        _SheetHandle(),
        const SizedBox(height: 20),
        Container(
          width: 64, height: 64,
          decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
          child: const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 40),
        ),
        const SizedBox(height: 12),
        const Text('OursMusic', style: TextStyle(color: kTextPrimary, fontSize: 22, fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text('Versao $_appVersion', style: const TextStyle(color: kTextSecond, fontSize: 13)),
        const SizedBox(height: 16),
        const Text('Sua musica, do seu jeito.\nStreaming de alta qualidade para todos.', style: TextStyle(color: kTextSecond, fontSize: 14, height: 1.5), textAlign: TextAlign.center),
        const SizedBox(height: 20),
        const Divider(color: Color(0xFF3A3A3A)),
        const SizedBox(height: 8),
        const Text('Desenvolvido com Flutter & NestJS', style: TextStyle(color: kTextMuted, fontSize: 11)),
        const SizedBox(height: 8),
      ]),
    ));
  }
}

// ── Update sheet ──────────────────────────────────────────────────────────────
const _kAppVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');

class _UpdateSheet extends StatefulWidget {
  @override
  State<_UpdateSheet> createState() => _UpdateSheetState();
}

class _UpdateSheetState extends State<_UpdateSheet> {
  bool _checking = false;
  String? _serverVersion;
  String? _notes;
  String? _downloadUrl;
  String? _error;
  bool _showNotes = false;

  @override
  void initState() {
    super.initState();
    // Load notes automatically on open
    _checkUpdate();
  }

  Future<void> _checkUpdate() async {
    setState(() { _checking = true; _error = null; _serverVersion = null; });
    try {
      final res = await Api.get('/app/version');
      if (res is Map<String, dynamic>) {
        setState(() {
          _serverVersion = res['version']?.toString() ?? '1.0.0';
          _notes = res['notes']?.toString() ?? '';
          _downloadUrl = res['mobileUrl']?.toString();
          _checking = false;
        });
      } else {
        setState(() { _error = 'Resposta inválida do servidor.'; _checking = false; });
      }
    } catch (e) {
      setState(() { _error = 'Não foi possível verificar. Verifique sua conexão.'; _checking = false; });
    }
  }

  bool get _hasUpdate {
    if (_serverVersion == null) return false;
    final s = _serverVersion!.split('.').map(int.tryParse).toList();
    final c = _kAppVersion.split('.').map(int.tryParse).toList();
    for (int i = 0; i < 3; i++) {
      final sv = i < s.length ? (s[i] ?? 0) : 0;
      final cv = i < c.length ? (c[i] ?? 0) : 0;
      if (sv > cv) return true;
      if (sv < cv) return false;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        _SheetHandle(),
        const SizedBox(height: 16),

        Row(children: [
          Container(
            width: 40, height: 40,
            decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
            child: const Icon(Icons.system_update, color: Colors.black, size: 22),
          ),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Atualizar OursMusic', style: TextStyle(color: kTextPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
            Text('Versao instalada: $_kAppVersion', style: const TextStyle(color: kTextSecond, fontSize: 12)),
          ]),
        ]),

        const SizedBox(height: 20),

        // Buttons row
        Row(children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _checking ? null : _checkUpdate,
              icon: _checking
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                : const Icon(Icons.refresh, size: 18),
              label: Text(_checking ? 'Verificando...' : 'Verificar atualização'),
              style: ElevatedButton.styleFrom(
                backgroundColor: kAccent, foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => setState(() => _showNotes = !_showNotes),
              icon: Icon(_showNotes ? Icons.expand_less : Icons.article_outlined, size: 18),
              label: const Text('Notas'),
              style: OutlinedButton.styleFrom(
                foregroundColor: kTextPrimary,
                side: const BorderSide(color: Color(0xFF3A3A3A)),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ]),

        // Result
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFF2A0808), borderRadius: BorderRadius.circular(8)),
            child: Row(children: [
              const Icon(Icons.error_outline, color: Color(0xFFF15E6C), size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFFF15E6C), fontSize: 13))),
            ]),
          ),
        ],

        if (_serverVersion != null && !_checking) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _hasUpdate ? kAccent.withOpacity(0.1) : const Color(0xFF1A2A1A),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _hasUpdate ? kAccent.withOpacity(0.4) : const Color(0xFF2A3A2A)),
            ),
            child: Row(children: [
              Icon(_hasUpdate ? Icons.system_update : Icons.check_circle,
                color: _hasUpdate ? kAccent : const Color(0xFF4CAF50), size: 20),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  _hasUpdate ? 'Atualização disponível: $_serverVersion' : 'Você está na versão mais recente!',
                  style: TextStyle(color: _hasUpdate ? kAccent : kTextPrimary, fontSize: 13, fontWeight: FontWeight.w700),
                ),
                if (_hasUpdate)
                  Text('Versao atual: $_kAppVersion', style: const TextStyle(color: kTextSecond, fontSize: 11)),
              ])),
              if (_hasUpdate && _downloadUrl != null)
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    UpdateService.checkForUpdate(context);
                  },
                  child: const Text('Baixar', style: TextStyle(color: kAccent, fontWeight: FontWeight.w800)),
                ),
            ]),
          ),
        ],

        // Notes panel
        if (_showNotes) ...[
          const SizedBox(height: 12),
          Container(
            constraints: const BoxConstraints(maxHeight: 200),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(8)),
            child: SingleChildScrollView(
              child: Text(
                _notes?.isNotEmpty == true
                  ? _notes!.replaceAll('\\n', '\n')
                  : 'Carregue as notas verificando a atualização.',
                style: const TextStyle(color: kTextSecond, fontSize: 12, height: 1.6),
              ),
            ),
          ),
        ],

        const SizedBox(height: 8),
      ]),
    ));
  }
}
