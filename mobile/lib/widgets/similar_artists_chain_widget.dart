import 'package:flutter/material.dart';
import '../hooks/use_similar_artists.dart';
import 'package:provider/provider.dart';

class SimilarArtistsChainWidget extends StatelessWidget {
  const SimilarArtistsChainWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<SimilarArtistsChain>(
      builder: (context, chain, _) => Column(
        children: [
          if (chain.chain.isEmpty)
            const Text('Selecione um artista para descobrir similares')
          else
            GridView.builder(
              shrinkWrap: true,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 1,
              ),
              itemCount: chain.chain.length,
              itemBuilder: (context, idx) {
                final artist = chain.chain[idx];
                return Column(
                  children: [
                    CircleAvatar(
                      backgroundImage: NetworkImage(artist['image']),
                      radius: 30,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      artist['name'],
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 12),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}
