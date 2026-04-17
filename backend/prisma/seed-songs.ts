import { PrismaClient, Song } from '@prisma/client';

const prisma = new PrismaClient();

const testSongs = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', albumName: 'A Night at the Opera', duration: 354 },
  { title: 'Imagine', artist: 'John Lennon', albumName: 'Imagine', duration: 183 },
  { title: 'Hotel California', artist: 'Eagles', albumName: 'Hotel California', duration: 391 },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin', albumName: 'Led Zeppelin IV', duration: 482 },
  { title: 'Like a Rolling Stone', artist: 'Bob Dylan', albumName: 'Highway 61 Revisited', duration: 369 },
  { title: 'Hey Jude', artist: 'The Beatles', albumName: 'Hey Jude', duration: 427 },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', albumName: 'Nevermind', duration: 301 },
  { title: 'Blinding Lights', artist: 'The Weeknd', albumName: 'After Hours', duration: 200 },
  { title: 'As It Was', artist: 'Harry Styles', albumName: 'Harry\'s House', duration: 172 },
  { title: 'Anti-Hero', artist: 'Taylor Swift', albumName: 'Midnights', duration: 229 },
  { title: 'Levitating', artist: 'Dua Lipa', albumName: 'Future Nostalgia', duration: 203 },
  { title: 'Good as Hell', artist: 'Lizzo', albumName: 'Cuz I Love You', duration: 172 },
  { title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', albumName: 'Uptown Special', duration: 269 },
  { title: 'Billie Jean', artist: 'Michael Jackson', albumName: 'Thriller', duration: 294 },
  { title: 'With or Without You', artist: 'U2', albumName: 'The Joshua Tree', duration: 355 },
  { title: 'Sweet Child o\' Mine', artist: 'Guns N\' Roses', albumName: 'Appetite for Destruction', duration: 356 },
  { title: 'Midnight Rain', artist: 'Taylor Swift', albumName: 'Midnights', duration: 169 },
  { title: 'Heat Waves', artist: 'Glass Animals', albumName: 'Dreamland', duration: 244 },
  { title: 'Faded', artist: 'Alan Walker', albumName: 'Different' , duration: 161 },
  { title: 'Sad Piano', artist: 'Various Artists', albumName: 'Melancholy Collection', duration: 240 },
];

async function seedSongs() {
  console.log('🎵 Seeding songs...');

  let created = 0;
  for (const song of testSongs) {
    const existing = await prisma.song.findFirst({
      where: { title: song.title, artist: song.artist },
    });

    if (!existing) {
      await prisma.song.create({
        data: {
          title: song.title,
          artist: song.artist,
          albumName: song.albumName,
          duration: song.duration,
          storagePath: `s3://oursmusic-songs/${song.title.toLowerCase().replace(/\s+/g, '-')}.mp3`,
          storageType: 'S3' as any,
          coverUrl: `https://picsum.photos/300?random=${Math.random()}`,
          fileSize: 5242880n,
          available: true,
        },
      });
      created++;
      console.log(`  ✓ Added: ${song.title} by ${song.artist}`);
    }
  }

  console.log(`\n✅ Seeded ${created} songs`);
}

seedSongs()
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
