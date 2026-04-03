import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import '../api.dart';

export 'package:just_audio/just_audio.dart' show LoopMode;

class PlayerController extends ChangeNotifier {
  AudioPlayer? _audio;

  Song? _current;
  List<Song> _queue = [];
  int _idx = 0;
  bool _playing = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  double _volume = 0.8;
  bool _shuffle = false;
  LoopMode _repeat = LoopMode.off;

  Song? get current => _current;
  List<Song> get queue => _queue;
  bool get playing => _playing;
  Duration get position => _position;
  Duration get duration => _duration;
  double get volume => _volume;
  bool get shuffle => _shuffle;
  LoopMode get repeat => _repeat;
  double get progress {
    if (_duration.inMilliseconds <= 0) return 0.0;
    return (_position.inMilliseconds / _duration.inMilliseconds).clamp(0.0, 1.0);
  }

  AudioPlayer? _getAudio() {
    if (_audio != null) return _audio;
    try {
      _audio = AudioPlayer();
      _audio!.playerStateStream.listen((s) {
        _playing = s.playing;
        if (s.processingState == ProcessingState.completed) _next();
        notifyListeners();
      });
      _audio!.positionStream.listen((p) { _position = p; notifyListeners(); });
      _audio!.durationStream.listen((d) { _duration = d ?? Duration.zero; notifyListeners(); });
    } catch (e) {
      debugPrint('AudioPlayer init error: $e');
      _audio = null;
    }
    return _audio;
  }

  Future<void> play(Song song, List<Song> queue) async {
    _queue = List.from(queue);
    _idx = _queue.indexWhere((s) => s.id == song.id);
    if (_idx < 0) _idx = 0;
    await _loadAndPlay(song);
  }

  Future<void> _loadAndPlay(Song song) async {
    _current = song;
    notifyListeners();
    try {
      final data = await Api.get('/songs/stream/${song.id}');
      if (data == null) return;
      final url = data['url']?.toString();
      if (url == null || url.isEmpty) return;
      final audio = _getAudio();
      if (audio == null) return;
      await audio.setVolume(_volume);
      await audio.setUrl(url);
      await audio.play();
    } catch (e) {
      debugPrint('Play error: $e');
    }
  }

  Future<void> togglePlay() async {
    try {
      final audio = _getAudio();
      if (audio == null) return;
      _playing ? await audio.pause() : await audio.play();
    } catch (e) {
      debugPrint('togglePlay error: $e');
    }
  }

  Future<void> _next() async {
    if (_queue.isEmpty) return;
    if (_repeat == LoopMode.one) {
      try { await _getAudio()?.seek(Duration.zero); await _getAudio()?.play(); } catch (_) {}
      return;
    }
    int next = _idx + 1;
    if (next >= _queue.length) {
      if (_repeat == LoopMode.all) next = 0; else return;
    }
    _idx = next;
    await _loadAndPlay(_queue[_idx]);
  }

  Future<void> skipNext() async => _next();

  Future<void> skipPrev() async {
    try {
      if (_position.inSeconds > 3) { await _getAudio()?.seek(Duration.zero); return; }
      if (_idx > 0) { _idx--; await _loadAndPlay(_queue[_idx]); }
    } catch (e) { debugPrint('skipPrev error: $e'); }
  }

  Future<void> seek(double pct) async {
    try {
      final ms = (_duration.inMilliseconds * pct).toInt();
      await _getAudio()?.seek(Duration(milliseconds: ms));
    } catch (_) {}
  }

  Future<void> setVolume(double v) async {
    _volume = v.clamp(0.0, 1.0);
    try { await _getAudio()?.setVolume(_volume); } catch (_) {}
    notifyListeners();
  }

  void toggleShuffle() { _shuffle = !_shuffle; notifyListeners(); }

  void cycleRepeat() {
    _repeat = _repeat == LoopMode.off ? LoopMode.one : _repeat == LoopMode.one ? LoopMode.all : LoopMode.off;
    try { _audio?.setLoopMode(_repeat); } catch (_) {}
    notifyListeners();
  }

  @override
  void dispose() {
    try { _audio?.dispose(); } catch (_) {}
    super.dispose();
  }
}
