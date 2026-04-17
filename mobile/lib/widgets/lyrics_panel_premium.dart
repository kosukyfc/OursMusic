import 'package:flutter/material.dart';
import 'package:intl/intl.dart' as intl;
import 'dart:async';
import 'dart:ui' as ui;

/// Model para versos e palavras sincronizadas
class LyricsWord {
  final String word;  // ✅ 'word' não 'text'
  final int startTime; // em ms
  final int endTime;   // em ms

  LyricsWord({
    required this.word,
    required this.startTime,
    required this.endTime,
  });
}

class LyricsVerse {
  final String id;
  final String text;
  final int startTime;   // em ms
  final int endTime;     // em ms
  final List<LyricsWord>? words;
  final String type;     // 'verse', 'chorus', etc

  LyricsVerse({
    required this.id,
    required this.text,
    required this.startTime,
    required this.endTime,
    this.words,
    this.type = 'verse',
  });
}

class LyricsData {
  final String trackId;
  final String title;
  final String artist;
  final List<LyricsVerse> lyrics;
  final String language;
  final bool hasWordSync;
  final int bpm;
  final int duration;

  LyricsData({
    required this.trackId,
    required this.title,
    required this.artist,
    required this.lyrics,
    this.language = 'pt-BR',
    this.hasWordSync = false,
    this.bpm = 120,
    this.duration = 0,
  });
}

/// Widget para exibir letras com sincronização de áudio (Karaokê Premium)
class LyricsPanelPremium extends StatefulWidget {
  final LyricsData? lyrics;
  final int currentTimeMs;
  final bool showKaraokeMode;
  final VoidCallback? onClose;
  final ValueChanged<int>? onSyncOffsetChanged;

  const LyricsPanelPremium({
    Key? key,
    this.lyrics,
    this.currentTimeMs = 0,
    this.showKaraokeMode = false,
    this.onClose,
    this.onSyncOffsetChanged,
  }) : super(key: key);

  @override
  State<LyricsPanelPremium> createState() => _LyricsPanelPremiumState();
}

class _LyricsPanelPremiumState extends State<LyricsPanelPremium>
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _scaleController;
  int _syncOffset = 0;
  int _currentVerseIndex = 0;
  Timer? _syncUpdateTimer;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeController.forward();
    _updateSyncState();
  }

  @override
  void didUpdateWidget(LyricsPanelPremium oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentTimeMs != widget.currentTimeMs) {
      _updateSyncState();
    }
  }

  void _updateSyncState() {
    if (widget.lyrics == null || widget.lyrics!.lyrics.isEmpty) return;

    final currentTime = widget.currentTimeMs + _syncOffset;
    
    // Encontra verso atual
    int newIndex = 0;
    for (int i = 0; i < widget.lyrics!.lyrics.length; i++) {
      final verse = widget.lyrics!.lyrics[i];
      if (currentTime >= verse.startTime && currentTime < verse.endTime) {
        newIndex = i;
        break;
      }
    }

    if (newIndex != _currentVerseIndex) {
      setState(() => _currentVerseIndex = newIndex);
      _scaleController.forward(from: 0);
      
      // Scroll para verso atual
      _scrollToCurrentVerse();
      
      // Haptic feedback
      HapticFeedback.lightImpact();
    }
  }

  void _scrollToCurrentVerse() {
    // Calcula posição para fazer scroll
    final targetOffset = _currentVerseIndex * 80.0;
    _scrollController.animateTo(
      targetOffset,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _scaleController.dispose();
    _syncUpdateTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.lyrics == null || widget.lyrics!.lyrics.isEmpty) {
      return _buildEmptyState();
    }

    return FadeTransition(
      opacity: _fadeController,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              const Color(0xFF1a1a1a).withOpacity(0.95),
              const Color(0xFF0d0d0d).withOpacity(0.98),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: widget.showKaraokeMode
                ? Colors.green.withOpacity(0.3)
                : Colors.grey.withOpacity(0.2),
            width: 1,
          ),
          boxShadow: [
            if (widget.showKaraokeMode)
              BoxShadow(
                color: Colors.green.withOpacity(0.2),
                blurRadius: 16,
                spreadRadius: 4,
              ),
          ],
        ),
        child: Column(
          children: [
            // ── Header ────────────────────────────────────────────
            _buildHeader(),

            // ── Lyrics content ─────────────────────────────────────
            Expanded(
              child: _buildLyricsContent(),
            ),

            // ── Karaokê controls (sync offset) ──────────────────────
            if (widget.showKaraokeMode) _buildKaraokeControls(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.lyrics!.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.lyrics!.artist,
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          Row(
            children: [
              if (widget.onClose != null)
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 20),
                  onPressed: widget.onClose,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 32,
                    minHeight: 32,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLyricsContent() {
    if (widget.lyrics!.lyrics.isEmpty) {
      return _buildEmptyState();
    }

    return SingleChildScrollView(
      controller: _scrollController,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          children: List.generate(
            widget.lyrics!.lyrics.length,
            (index) => _buildVerseItem(index),
          ),
        ),
      ),
    );
  }

  Widget _buildVerseItem(int index) {
    final verse = widget.lyrics!.lyrics[index];
    final isCurrent = index == _currentVerseIndex;
    final currentTime = widget.currentTimeMs + _syncOffset;
    final verseProgress = ((currentTime - verse.startTime) /
            (verse.endTime - verse.startTime))
        .clamp(0.0, 1.0);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: ScaleTransition(
        scale: isCurrent ? _scaleController : AlwaysStoppedAnimation(1.0),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isCurrent
                ? Colors.green.withOpacity(0.15)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isCurrent
                  ? Colors.green.withOpacity(0.5)
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: widget.lyrics!.hasWordSync && verse.words != null
              ? _buildWordSyncVerse(verse, isCurrent, verseProgress)
              : _buildSimpleVerse(verse, isCurrent),
        ),
      ),
    );
  }

  Widget _buildSimpleVerse(LyricsVerse verse, bool isCurrent) {
    return Opacity(
      opacity: isCurrent ? 1.0 : 0.6,
      child: Text(
        verse.text,
        style: TextStyle(
          color: isCurrent ? Colors.green[300] : Colors.white70,
          fontSize: isCurrent ? 18 : 16,
          fontWeight: FontWeight.w600,
          height: 1.5,
        ),
      ),
    );
  }

  Widget _buildWordSyncVerse(
    LyricsVerse verse,
    bool isCurrent,
    double verseProgress,
  ) {
    if (verse.words == null || verse.words!.isEmpty) {
      return _buildSimpleVerse(verse, isCurrent);
    }

    final currentTime = widget.currentTimeMs + _syncOffset;

    return Wrap(
      spacing: 4,
      runSpacing: 8,
      children: verse.words!
          .map((word) {
            final isWordActive = currentTime >= word.startTime &&
                currentTime < word.endTime;
            final wordProgress = isWordActive
                ? ((currentTime - word.startTime) /
                    (word.endTime - word.startTime))
                : 0;

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isWordActive ? Colors.green.withOpacity(0.4) : null,
                borderRadius: BorderRadius.circular(4),
                boxShadow: isWordActive
                    ? [
                        BoxShadow(
                          color: Colors.green.withOpacity(0.5),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ]
                    : null,
              ),
              child: Text(
                word.word,  // ✅ Corrigido: word.word
                style: TextStyle(
                  color: isWordActive ? Colors.green[200] : Colors.white70,
                  fontSize: isCurrent ? 16 : 14,
                  fontWeight: isWordActive ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            );
          })
          .toList(),
    );
  }

  Widget _buildKaraokeControls() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: Colors.grey.withOpacity(0.2)),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Sync: ${_syncOffset}ms',
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () {
                      setState(() => _syncOffset = 0);
                      widget.onSyncOffsetChanged?.call(0);
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.green),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    child: const Text(
                      'Reset',
                      style: TextStyle(color: Colors.green, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Slider(
            value: _syncOffset.toDouble(),
            min: -500,
            max: 500,
            divisions: 100,
            label: '${_syncOffset}ms',
            onChanged: (value) {
              setState(() => _syncOffset = value.toInt());
              widget.onSyncOffsetChanged?.call(_syncOffset);
            },
            activeColor: Colors.green,
            inactiveColor: Colors.grey.withOpacity(0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.music_note, color: Colors.grey, size: 48),
          const SizedBox(height: 12),
          Text(
            'Letras não disponíveis',
            style: TextStyle(
              color: Colors.grey[500],
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
