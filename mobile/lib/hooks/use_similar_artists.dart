import 'package:flutter/material.dart';

class SimilarArtistsChain extends ChangeNotifier {
  List<Map<String, dynamic>> _chain = [];
  
  List<Map<String, dynamic>> get chain => _chain;
  
  void buildChain(String startArtist, Map<String, List<String>> artistRelationships) {
    _chain = [];
    final visited = <String>{};
    _buildRecursive(startArtist, artistRelationships, visited, 0);
    notifyListeners();
  }
  
  void _buildRecursive(
    String artist,
    Map<String, List<String>> relationships,
    Set<String> visited,
    int depth,
  ) {
    if (depth >= 3 || visited.contains(artist)) return;
    
    visited.add(artist);
    _chain.add({
      'name': artist,
      'depth': depth,
      'image': 'https://via.placeholder.com/100?text=${artist[0]}',
    });
    
    final similar = relationships[artist] ?? [];
    for (var related in similar.take(2)) {
      _buildRecursive(related, relationships, visited, depth + 1);
    }
  }
  
  void clear() {
    _chain = [];
    notifyListeners();
  }
}
