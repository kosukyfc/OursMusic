import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api.dart';
import '../theme.dart';

const _kLastSeenVersion  = 'om_last_seen_version';
const _kInstalledVersion = 'om_installed_version';

class UpdateService {
  /// Checks for a new version and shows the update sheet if available.
  /// [currentAppVersion] is the version string compiled into the app (e.g. "1.0.0").
  static Future<void> checkAndShow(
    BuildContext context, {
    String currentAppVersion = '1.0.0',
  }) async {
    try {
      final data = await Api.get('/app/version');
      if (data is! Map<String, dynamic>) return;

      final serverVersion = data['version']?.toString();
      final notes         = data['notes']?.toString() ?? '';
      final downloadUrl   = data['mobileUrl']?.toString() ?? '';

      if (serverVersion == null || serverVersion.isEmpty) return;
      if (downloadUrl.isEmpty) return;

      final prefs       = await SharedPreferences.getInstance();
      final lastSeen    = prefs.getString(_kLastSeenVersion);
      final installedV  = prefs.getString(_kInstalledVersion) ?? currentAppVersion;

      // Already seen this version notification — skip
      if (lastSeen == serverVersion) return;

      // No update needed if server version matches installed
      if (_versionCompare(serverVersion, installedV) <= 0) return;

      await prefs.setString(_kLastSeenVersion, serverVersion);

      if (!context.mounted) return;

      final isUpdate = _versionCompare(installedV, currentAppVersion) > 0;

      showModalBottomSheet(
        context: context,
        backgroundColor: const Color(0xFF1A1A1A),
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (_) => _UpdateSheet(
          serverVersion: serverVersion,
          notes: notes,
          downloadUrl: downloadUrl,
          isUpdate: isUpdate,
          onInstalled: () async {
            await prefs.setString(_kInstalledVersion, serverVersion);
          },
        ),
      );
    } catch (_) {
      // Non-critical — silently ignore
    }
  }

  /// Returns positive if a > b, 0 if equal, negative if a < b
  static int _versionCompare(String a, String b) {
    final pa = a.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    final pb = b.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    for (var i = 0; i < 3; i++) {
      final va = i < pa.length ? pa[i] : 0;
      final vb = i < pb.length ? pb[i] : 0;
      if (va != vb) return va - vb;
    }
    return 0;
  }

  /// Alias for manual trigger from settings menu
  static Future<void> checkForUpdate(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kLastSeenVersion); // force re-check
    await checkAndShow(context, currentAppVersion: '1.0.0');
  }

  /// Returns remaining grace period duration, or null if no grace period active
  static Future<Duration?> getGracePeriodRemaining(String serverVersion) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final installedV = prefs.getString(_kInstalledVersion) ?? '1.0.0';
      if (_versionCompare(serverVersion, installedV) <= 0) return null;
      // Grace period: 24h from when the update was first seen
      final firstSeenKey = 'om_first_seen_$serverVersion';
      final firstSeenStr = prefs.getString(firstSeenKey);
      if (firstSeenStr == null) {
        await prefs.setString(firstSeenKey, DateTime.now().toIso8601String());
        return const Duration(hours: 24);
      }
      final firstSeen = DateTime.tryParse(firstSeenStr);
      if (firstSeen == null) return null;
      final elapsed = DateTime.now().difference(firstSeen);
      const grace = Duration(hours: 24);
      if (elapsed >= grace) return Duration.zero;
      return grace - elapsed;
    } catch (_) {
      return null;
    }
  }
}

// ── Update Sheet ──────────────────────────────────────────────────────────────

class _UpdateSheet extends StatefulWidget {
  final String serverVersion;
  final String notes;
  final String downloadUrl;
  final bool isUpdate;
  final Future<void> Function() onInstalled;

  const _UpdateSheet({
    required this.serverVersion,
    required this.notes,
    required this.downloadUrl,
    required this.isUpdate,
    required this.onInstalled,
  });

  @override
  State<_UpdateSheet> createState() => _UpdateSheetState();
}

class _UpdateSheetState extends State<_UpdateSheet> {
  double _progress = 0;
  bool _downloading = false;
  String? _error;

  Future<void> _downloadAndInstall() async {
    setState(() { _downloading = true; _error = null; _progress = 0; });

    try {
      // Verifica permissão ANTES de baixar (Android 8+)
      if (Platform.isAndroid) {
        final status = await Permission.requestInstallPackages.status;
        if (!status.isGranted) {
          setState(() { _downloading = false; });
          if (!mounted) return;
          // Mostra dialog explicativo antes de abrir configurações
          final goToSettings = await showDialog<bool>(
            context: context,
            builder: (_) => AlertDialog(
              backgroundColor: const Color(0xFF282828),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Permissão necessária', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
              content: const Text(
                'Para instalar atualizações, o OursMusic precisa de permissão para instalar apps.\n\nToque em "Abrir configurações", habilite a opção e volte para continuar.',
                style: TextStyle(color: Color(0xFFB3B3B3), fontSize: 14, height: 1.5),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar', style: TextStyle(color: Color(0xFFB3B3B3)))),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: ElevatedButton.styleFrom(backgroundColor: kAccent, foregroundColor: Colors.black),
                  child: const Text('Abrir configurações', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ],
            ),
          );
          if (goToSettings == true) await openAppSettings();
          return;
        }
      }

      // Get temp directory
      final dir  = await getTemporaryDirectory();
      final path = '${dir.path}/oursmusic_update.apk';
      final file = File(path);

      // Stream download with progress
      final request  = http.Request('GET', Uri.parse(widget.downloadUrl));
      final response = await request.send().timeout(const Duration(minutes: 10));

      if (response.statusCode != 200) {
        throw Exception('Erro HTTP ${response.statusCode}');
      }

      final total  = response.contentLength ?? 0;
      var received = 0;
      final sink   = file.openWrite();

      await for (final chunk in response.stream) {
        sink.add(chunk);
        received += chunk.length;
        if (total > 0 && mounted) {
          setState(() => _progress = received / total);
        }
      }
      await sink.close();

      if (!mounted) return;
      setState(() { _progress = 1.0; _downloading = false; });

      await widget.onInstalled();

      // Open APK installer
      final result = await OpenFile.open(path);
      if (result.type != ResultType.done && mounted) {
        setState(() => _error = 'Não foi possível abrir o instalador: ${result.message}');
      }
    } catch (e) {
      if (mounted) {
        setState(() { _downloading = false; _error = e.toString(); });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final label = widget.isUpdate ? 'Atualizar por cima' : 'Instalar';
    final icon  = widget.isUpdate ? Icons.system_update : Icons.install_mobile;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFF3A3A3A),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header
            Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: kAccent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: kAccent, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    widget.isUpdate ? 'Atualização disponível' : 'Nova versão disponível',
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  Text(
                    'Versão ${widget.serverVersion}',
                    style: const TextStyle(color: kTextMuted, fontSize: 12),
                  ),
                ]),
              ),
            ]),

            const SizedBox(height: 16),
            const Divider(color: Color(0xFF2A2A2A)),
            const SizedBox(height: 12),

            // Notes
            if (widget.notes.isNotEmpty)
              Text(
                widget.notes,
                style: const TextStyle(color: kTextSecond, fontSize: 14, height: 1.6),
              )
            else
              const Text(
                'Melhorias de desempenho e correções de bugs.',
                style: TextStyle(color: kTextSecond, fontSize: 14, height: 1.6),
              ),

            const SizedBox(height: 20),

            // Progress bar
            if (_downloading || _progress > 0) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: _progress > 0 ? _progress : null,
                  backgroundColor: const Color(0xFF2A2A2A),
                  valueColor: AlwaysStoppedAnimation<Color>(kAccent),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _progress >= 1.0
                    ? 'Concluído! Abrindo instalador...'
                    : 'Baixando... ${(_progress * 100).toStringAsFixed(0)}%',
                style: const TextStyle(color: kTextMuted, fontSize: 12),
              ),
              const SizedBox(height: 12),
            ],

            // Error
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
              ),
              const SizedBox(height: 12),
            ],

            // Buttons
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _downloading ? null : () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: kTextMuted,
                    side: const BorderSide(color: Color(0xFF3A3A3A)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Agora não'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: _downloading || _progress >= 1.0 ? null : _downloadAndInstall,
                  icon: _downloading
                      ? const SizedBox(
                          width: 16, height: 16,
                          child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                        )
                      : Icon(icon, size: 18),
                  label: Text(_downloading ? 'Baixando...' : label),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kAccent,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
