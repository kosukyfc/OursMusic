import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtistRelationshipService {
  constructor(private prisma: PrismaService) {}

  async findSimilarArtists(artistId: string, limit = 10) {
    return this.prisma.artistRelationship.findMany({
      where: { artistId },
      orderBy: { similarity: 'desc' },
      take: limit,
    });
  }

  async buildRelationshipChain(startArtistId: string, depth = 3) {
    const chain: any = [];
    const visited = new Set<string>();

    const dfs = async (artistId: string, currentDepth: number) => {
      if (currentDepth >= depth || visited.has(artistId)) return;

      visited.add(artistId);
      const similar = await this.findSimilarArtists(artistId, 2);

      for (const rel of similar) {
        chain.push({
          artistId: rel.relatedArtistId,
          depth: currentDepth,
          similarity: rel.similarity,
        });
        await dfs(rel.relatedArtistId, currentDepth + 1);
      }
    };

    await dfs(startArtistId, 0);
    return chain;
  }

  async addRelationship(artistId: string, relatedArtistId: string, similarity: number) {
    return this.prisma.artistRelationship.upsert({
      where: {
        artistId_relatedArtistId: { artistId, relatedArtistId },
      },
      update: { similarity },
      create: { artistId, relatedArtistId, similarity },
    });
  }
}
