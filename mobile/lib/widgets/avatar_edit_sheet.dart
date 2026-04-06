import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api.dart';
import '../theme.dart';

/// Bottom sheet para trocar foto de perfil.
/// Suporta: arquivo local (câmera/galeria) ou link URL.
class AvatarEditSheet extends StatefulWidget {
  final String? currentUrl;
  final void Function(String url) onSaved;

  const AvatarEditSheet({super.key, this.currentUrl, required this.onSaved});

  @override
  State<AvatarEditSheet> createState() => _AvatarEditSheetState();
}

class _AvatarEditSheetState extends State<AvatarEditSheet> {
  final _urlCtrl = TextEditingController();
  String? _previewUrl;
  File? _localFile;
  bool _loading = false;
  String _error = '';
  int _tab = 0; // 0 = arquivo, 1 = URL

  @override
  void initState() {
    super.initState();
    _previewUrl = widget.currentUrl;
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, maxWidth: 512, imageQuality: 85);
    if (picked == null) return;
    setState(() {
      _localFile = File(picked.path);
      _previewUrl = picked.path;
    });
  }

  Future<void> _save() async {
    setState(() { _loading = true; _error = ''; });
    try {
      if (_tab == 0 && _localFile != null) {
        final bytes = await _localFile!.readAsBytes();
        final ext = _localFile!.path.split('.').last;
        final mime = ext == 'png' ? 'image/png' : 'image/jpeg';
        final data = await Api.uploadFile('/social/profile/avatar', bytes, 'avatar.$ext', mime);
        final url = data?['avatarUrl']?.toString();
        if (url != null) widget.onSaved(url);
      } else if (_tab == 1 && _urlCtrl.text.trim().isNotEmpty) {
        final data = await Api.post('/social/profile', {'avatarUrl': _urlCtrl.text.trim()});
        final url = data?['avatarUrl']?.toString() ?? _urlCtrl.text.trim();
        widget.onSaved(url);
      } else {
        setState(() { _error = 'Selecione uma imagem ou insira uma URL'; _loading = false; });
        return;
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceAll('Exception: ', ''); });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: Color(0xFF282828),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            // Handle
            Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF535353), borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),

            const Text('Foto de perfil', style: TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 20),

            // Preview
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(shape: BoxShape.circle, color: kAccent,
                border: Border.all(color: kAccent, width: 2)),
              clipBehavior: Clip.antiAlias,
              child: _previewUrl != null
                ? (_localFile != null
                    ? Image.file(_localFile!, fit: BoxFit.cover)
                    : Image.network(_previewUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.person, color: Colors.black, size: 40)))
                : const Icon(Icons.person, color: Colors.black, size: 40),
            ),
            const SizedBox(height: 20),

            // Tabs
            Row(children: [
              Expanded(child: _TabBtn(label: '📁 Arquivo', selected: _tab == 0, onTap: () => setState(() => _tab = 0))),
              const SizedBox(width: 8),
              Expanded(child: _TabBtn(label: '🔗 URL', selected: _tab == 1, onTap: () => setState(() => _tab = 1))),
            ]),
            const SizedBox(height: 16),

            if (_tab == 0) ...[
              Row(children: [
                Expanded(child: _PickBtn(icon: Icons.photo_library, label: 'Galeria', onTap: () => _pickImage(ImageSource.gallery))),
                const SizedBox(width: 8),
                Expanded(child: _PickBtn(icon: Icons.camera_alt, label: 'Câmera', onTap: () => _pickImage(ImageSource.camera))),
              ]),
            ] else ...[
              TextField(
                controller: _urlCtrl,
                style: const TextStyle(color: kTextPrimary),
                onChanged: (v) => setState(() => _previewUrl = v.isNotEmpty ? v : widget.currentUrl),
                decoration: InputDecoration(
                  hintText: 'https://exemplo.com/foto.jpg',
                  hintStyle: const TextStyle(color: kTextMuted),
                  filled: true, fillColor: const Color(0xFF3A3A3A),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ],

            if (_error.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(_error, style: const TextStyle(color: Color(0xFFF15E6C), fontSize: 12)),
            ],

            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kAccent, foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
                ),
                child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                  : const Text('Salvar foto', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _TabBtn extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _TabBtn({required this.label, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: selected ? kAccent : const Color(0xFF3A3A3A),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, textAlign: TextAlign.center,
        style: TextStyle(color: selected ? Colors.black : kTextPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
    ),
  );
}

class _PickBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _PickBtn({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(color: const Color(0xFF3A3A3A), borderRadius: BorderRadius.circular(8)),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, color: kTextPrimary, size: 24),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: kTextPrimary, fontSize: 12)),
      ]),
    ),
  );
}
