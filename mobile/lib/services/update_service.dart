import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../api.dart';

const _appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');

// Chaves de persistência
const _kGracePeriodStart = 'grace_period_start';
const _kGracePeriodVersion = 'grace_period_version';
const _kGracePeriodHours = 48;

class UpdateService {
  /// Verifica atualização e exibe dialog se necessário.
  /// [forceCheck] ignora o grace period e sempre mostra o dialog.
  static Future<void> checkForUpdate(BuildContext context, {bool forceCheck = false}) async {
    try {
      final res = await http.get(Uri.parse('$kApiBase/app/version'))
          .timeout(const Duration(seconds: 5));
      if (res.statusCode != 200) return;

      dynamic data;
      try { data = jsonDecode(res.body); } catch (_) { return; }
      if (data is! Map<String, dynamic>) return;

      final serverVersion = data['version']?.toString() ?? '1.0.0';
      final downloadUrl = data['mobileUrl']?.toString();
      final notes = data['notes']?.toString() ?? '';

      if (!_isNewer(serverVersion, _appVersion)) return;
      if (!context.mounted) return;

      // Verifica se o grace period já expirou
      final expired = await _isGracePeriodExpired(serverVersion);

      showDialog(
        context: context,
        barrierDismissible: !expired, // Não pode fechar se expirou
        builder: (_) => _UpdateDialog(
          currentVersion: _appVersion,
          newVersion: serverVersion,
          notes: notes,
          downloadUrl: downloadUrl,
          forceUpdate: expired, // Esconde "Entendido" se expirou
          onDismissed: () => _startGracePeriod(serverVersion),
        ),
      );
    } catch (_) {}
  }

  /// Inicia o grace period para a versão informada.
  static Future<void> _startGracePeriod(String version) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_kGracePeriodVersion);
    // Só inicia se ainda não foi iniciado para essa versão
    if (existing != version) {
      await prefs.setString(_kGracePeriodVersion, version);
      await prefs.setString(_kGracePeriodStart, DateTime.now().toIso8601String());
    }
  }

  /// Retorna true se o grace period de 48h expirou para a versão informada.
  static Future<bool> _isGracePeriodExpired(String version) async {
    final prefs = await SharedPreferences.getInstance();
    final gracePeriodVersion = prefs.getString(_kGracePeriodVersion);
    if (gracePeriodVersion != version) return false; // Grace period não iniciado

    final startStr = prefs.getString(_kGracePeriodStart);
    if (startStr == null) return false;

    final start = DateTime.tryParse(startStr);
    if (start == null) return false;

    final elapsed = DateTime.now().difference(start);
    return elapsed.inHours >= _kGracePeriodHours;
  }

  /// Retorna o tempo restante do grace period em horas, ou null se não iniciado.
  static Future<Duration?> getGracePeriodRemaining(String version) async {
    final prefs = await SharedPreferences.getInstance();
    final gracePeriodVersion = prefs.getString(_kGracePeriodVersion);
    if (gracePeriodVersion != version) return null;

    final startStr = prefs.getString(_kGracePeriodStart);
    if (startStr == null) return null;

    final start = DateTime.tryParse(startStr);
    if (start == null) return null;

    final deadline = start.add(const Duration(hours: _kGracePeriodHours));
    final remaining = deadline.difference(DateTime.now());
    return remaining.isNegative ? Duration.zero : remaining;
  }

  static bool _isNewer(String server, String current) {
    final s = server.split('.').map(int.tryParse).toList();
    final c = current.split('.').map(int.tryParse).toList();
    for (int i = 0; i < 3; i++) {
      final sv = i < s.length ? (s[i] ?? 0) : 0;
      final cv = i < c.length ? (c[i] ?? 0) : 0;
      if (sv > cv) return true;
      if (sv < cv) return false;
    }
    return false;
  }
}

// ── Dialog de atualização multi-página ───────────────────────────────────────
class _UpdateDialog extends StatefulWidget {
  final String currentVersion;
  final String newVersion;
  final String notes;
  final String? downloadUrl;
  final bool forceUpdate;
  final VoidCallback onDismissed;

  const _UpdateDialog({
    required this.currentVersion,
    required this.newVersion,
    required this.notes,
    required this.downloadUrl,
    required this.forceUpdate,
    required this.onDismissed,
  });

  @override
  State<_UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<_UpdateDialog> {
  int _page = 0; // 0 = notas, 1 = ações
  bool _downloading = false;
  double _progress = 0;
  String _status = '';
  File? _apkFile; // arquivo baixado, pronto para instalar

  Future<void> _download() async {
    if (widget.downloadUrl == null) return;
    setState(() { _downloading = true; _status = 'Baixando atualização...'; _progress = 0; _apkFile = null; });

    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/oursmusic-update.apk');

      final client = http.Client();
      final request = http.Request('GET', Uri.parse(widget.downloadUrl!));
      final response = await client.send(request);
      final total = response.contentLength ?? 0;
      int received = 0;

      final sink = file.openWrite();
      await response.stream.forEach((chunk) {
        sink.add(chunk);
        received += chunk.length;
        if (total > 0 && mounted) setState(() => _progress = received / total);
      });
      await sink.close();

      // Download concluído — guarda arquivo e mostra botão instalar
      if (mounted) setState(() {
        _downloading = false;
        _status = 'Download concluído!';
        _apkFile = file;
      });
    } catch (e) {
      if (mounted) setState(() { _status = 'Erro ao baixar: $e'; _downloading = false; });
    }
  }

  Future<void> _install() async {
    if (_apkFile == null) return;
    try {
      final result = await OpenFile.open(_apkFile!.path);
      if (result.type != ResultType.done && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Não foi possível abrir o instalador: ${result.message}'),
          backgroundColor: const Color(0xFF2A0808),
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Erro ao instalar: $e'),
        backgroundColor: const Color(0xFF2A0808),
      ));
    }
  }

  void _dismiss() {
    widget.onDismissed();
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1E1E1E),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.75,
          maxWidth: 400,
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // ── Header ──────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            decoration: const BoxDecoration(
              color: Color(0xFF282828),
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(children: [
              Container(
                width: 40, height: 40,
                decoration: const BoxDecoration(color: Color(0xFF1DB954), shape: BoxShape.circle),
                child: const Icon(Icons.system_update_rounded, color: Colors.black, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Atualização disponível', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                Text(
                  '${widget.currentVersion} → ${widget.newVersion}',
                  style: const TextStyle(color: Color(0xFF1DB954), fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ])),
              // Indicador de página (dots)
              Row(children: List.generate(2, (i) => AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                width: i == _page ? 16 : 6,
                height: 6,
                margin: const EdgeInsets.only(left: 4),
                decoration: BoxDecoration(
                  color: i == _page ? const Color(0xFF1DB954) : const Color(0xFF4A4A4A),
                  borderRadius: BorderRadius.circular(3),
                ),
              ))),
            ]),
          ),

          // ── Conteúdo por página ──────────────────────────────────────────
          Flexible(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              transitionBuilder: (child, anim) => SlideTransition(
                position: Tween<Offset>(
                  begin: Offset(_page == 0 ? -1 : 1, 0),
                  end: Offset.zero,
                ).animate(anim),
                child: child,
              ),
              child: _page == 0
                  ? _NotesPage(key: const ValueKey(0), notes: widget.notes)
                  : _ActionsPage(
                      key: const ValueKey(1),
                      forceUpdate: widget.forceUpdate,
                      downloading: _downloading,
                      progress: _progress,
                      status: _status,
                      onDismiss: _dismiss,
                      onDownload: _download,
                    ),
            ),
          ),

          // ── Footer ───────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            decoration: const BoxDecoration(
              color: Color(0xFF282828),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
            ),
            child: _page == 0
                ? SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => setState(() => _page = 1),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1DB954),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text('Próxima', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                        SizedBox(width: 6),
                        Icon(Icons.arrow_forward_rounded, size: 18),
                      ]),
                    ),
                  )
                : Row(children: [
                    // Botão voltar
                    if (!_downloading && _apkFile == null)
                      TextButton(
                        onPressed: () => setState(() => _page = 0),
                        child: const Text('← Voltar', style: TextStyle(color: Color(0xFFB3B3B3))),
                      ),
                    const Spacer(),
                    // Botão "Entendido" — oculto se force update ou se já baixou
                    if (!widget.forceUpdate && !_downloading && _apkFile == null)
                      TextButton(
                        onPressed: _dismiss,
                        child: const Text('Entendido', style: TextStyle(color: Color(0xFFB3B3B3))),
                      ),
                    if (!_downloading && _apkFile == null) const SizedBox(width: 8),
                    // Botão baixar — só aparece se ainda não baixou
                    if (!_downloading && _apkFile == null)
                      ElevatedButton.icon(
                        onPressed: _download,
                        icon: const Icon(Icons.download_rounded, size: 18),
                        label: const Text('Baixar Atualização', style: TextStyle(fontWeight: FontWeight.w800)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1DB954),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    // Botão instalar — aparece após download concluído
                    if (_apkFile != null)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _install,
                          icon: const Icon(Icons.install_mobile_rounded, size: 20),
                          label: const Text('Instalar Agora', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1DB954),
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                  ]),
          ),
        ]),
      ),
    );
  }
}

// ── Página 1: Notas de atualização ───────────────────────────────────────────
class _NotesPage extends StatelessWidget {
  final String notes;
  const _NotesPage({super.key, required this.notes});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('O que há de novo:', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        Text(
          notes.replaceAll('\\n', '\n'),
          style: const TextStyle(color: Color(0xFFB3B3B3), fontSize: 13, height: 1.7),
        ),
        const SizedBox(height: 8),
      ]),
    );
  }
}

// ── Página 2: Ações ──────────────────────────────────────────────────────────
class _ActionsPage extends StatelessWidget {
  final bool forceUpdate;
  final bool downloading;
  final double progress;
  final String status;
  final VoidCallback onDismiss;
  final VoidCallback onDownload;

  const _ActionsPage({
    super.key,
    required this.forceUpdate,
    required this.downloading,
    required this.progress,
    required this.status,
    required this.onDismiss,
    required this.onDownload,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        // Ícone central
        Container(
          width: 72, height: 72,
          decoration: BoxDecoration(
            color: const Color(0xFF1DB954).withOpacity(0.15),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.system_update_rounded, color: Color(0xFF1DB954), size: 36),
        ),
        const SizedBox(height: 16),

        if (forceUpdate) ...[
          // Aviso de expiração
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF2A0808),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFF15E6C).withOpacity(0.4)),
            ),
            child: const Row(children: [
              Icon(Icons.warning_rounded, color: Color(0xFFF15E6C), size: 20),
              SizedBox(width: 10),
              Expanded(child: Text(
                'O prazo de 48 horas expirou. Atualize para continuar usando o OursMusic.',
                style: TextStyle(color: Color(0xFFF15E6C), fontSize: 13, height: 1.4),
              )),
            ]),
          ),
        ] else ...[
          const Text(
            'Pronto para atualizar?',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'Você tem 48 horas para atualizar antes que esta versão deixe de funcionar.',
            style: TextStyle(color: Color(0xFFB3B3B3), fontSize: 13, height: 1.5),
            textAlign: TextAlign.center,
          ),
        ],

        const SizedBox(height: 16),

        // Progresso de download
        if (downloading) ...[
          LinearProgressIndicator(
            value: progress > 0 ? progress : null,
            backgroundColor: const Color(0xFF3A3A3A),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1DB954)),
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
          const SizedBox(height: 10),
          Text(
            progress > 0 ? '${(progress * 100).toInt()}% — $status' : status,
            style: const TextStyle(color: Color(0xFFB3B3B3), fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ] else if (status == 'Download concluído!') ...[
          // Feedback visual de download concluído
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0D2A0D),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF1DB954).withOpacity(0.4)),
            ),
            child: const Row(children: [
              Icon(Icons.check_circle_rounded, color: Color(0xFF1DB954), size: 20),
              SizedBox(width: 10),
              Expanded(child: Text(
                'APK baixado com sucesso! Toque em "Instalar Agora" para atualizar.',
                style: TextStyle(color: Color(0xFF1DB954), fontSize: 13, height: 1.4),
              )),
            ]),
          ),
        ],
      ]),
    );
  }
}
