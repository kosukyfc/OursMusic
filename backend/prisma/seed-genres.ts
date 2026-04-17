import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Genre mapping for songs
const genreMapping: Record<string, string[]> = {
  // Queen
  'Bohemian Rhapsody': ['rock', 'progressive-rock', 'opera'],
  'Another One Bites the Dust': ['rock', 'funk', 'disco'],
  'Don\'t Stop Me Now': ['rock', 'funk'],
  'Somebody to Love': ['rock', 'soul'],
  
  // Beatles
  'Let It Be': ['rock', 'classic-rock', 'pop'],
  'Hey Jude': ['rock', 'classic-rock', 'pop'],
  'Yesterday': ['rock', 'ballad', 'classic-rock'],
  'Come Together': ['rock', 'funk', 'psychedelic'],
  
  // Eagles
  'Hotel California': ['rock', 'hard-rock', 'classic-rock'],
  'Desperado': ['country', 'rock', 'ballad'],
  'Take It Easy': ['country-rock', 'rock'],
  'The Long Run': ['rock', 'classic-rock'],
  
  // Taylor Swift
  'Blank Space': ['pop', 'synth-pop'],
  'Love Story': ['pop', 'country-pop'],
  'Style': ['pop', 'synth-pop'],
  'Shake It Off': ['pop', 'dance-pop'],
  
  // The Weeknd
  'Blinding Lights': ['synthwave', 'electronic', 'pop'],
  'Starboy': ['r-and-b', 'electronic', 'hip-hop'],
  'Can\'t Feel My Face': ['synth-pop', 'electronic'],
};

// All available genres
const allGenres = [
  { name: 'rock', description: 'Rock music' },
  { name: 'pop', description: 'Pop music' },
  { name: 'hip-hop', description: 'Hip-Hop and Rap' },
  { name: 'r-and-b', description: 'R&B and Soul' },
  { name: 'electronic', description: 'Electronic and Dance' },
  { name: 'country', description: 'Country music' },
  { name: 'jazz', description: 'Jazz' },
  { name: 'blues', description: 'Blues' },
  { name: 'classical', description: 'Classical music' },
  { name: 'indie', description: 'Indie music' },
  { name: 'reggae', description: 'Reggae' },
  { name: 'metal', description: 'Heavy Metal' },
  { name: 'punk', description: 'Punk Rock' },
  { name: 'funk', description: 'Funk' },
  { name: 'soul', description: 'Soul Music' },
  { name: 'disco', description: 'Disco' },
  { name: 'ballad', description: 'Ballad' },
  { name: 'classic-rock', description: 'Classic Rock' },
  { name: 'hard-rock', description: 'Hard Rock' },
  { name: 'progressive-rock', description: 'Progressive Rock' },
  { name: 'opera', description: 'Opera' },
  { name: 'psychedelic', description: 'Psychedelic Rock' },
  { name: 'synth-pop', description: 'Synth-Pop' },
  { name: 'synthwave', description: 'Synthwave' },
  { name: 'country-pop', description: 'Country Pop' },
  { name: 'country-rock', description: 'Country Rock' },
  { name: 'dance-pop', description: 'Dance-Pop' },
];

async function seedGenres() {
  console.log('🎵 Seeding genres...');

  // Create all genres
  const createdGenres: Record<string, string> = {};
  for (const genre of allGenres) {
    const created = await prisma.genre.upsert({
      where: { name: genre.name },
      update: { description: genre.description },
      create: { name: genre.name, description: genre.description },
    });
    createdGenres[genre.name] = created.id;
  }
  console.log(`✅ Created ${Object.keys(createdGenres).length} genres`);

  // Get all songs and assign genres
  const songs = await prisma.song.findMany({
    select: { id: true, title: true, artist: true },
  });

  let songsWithGenres = 0;
  for (const song of songs) {
    let genres = genreMapping[song.title] || [];

    // Default genres based on artist
    if (genres.length === 0) {
      if (song.artist?.includes('Queen')) genres = ['rock', 'funk'];
      else if (song.artist?.includes('Beatles')) genres = ['rock', 'classic-rock', 'pop'];
      else if (song.artist?.includes('Eagles')) genres = ['rock', 'country-rock'];
      else if (song.artist?.includes('Taylor Swift')) genres = ['pop', 'country-pop'];
      else if (song.artist?.includes('The Weeknd')) genres = ['r-and-b', 'electronic', 'synthwave'];
      else genres = ['pop', 'rock']; // Fallback
    }

    // Associate song with genres
    for (const genreName of genres) {
      const genreId = createdGenres[genreName];
      if (genreId) {
        await prisma.genreSong.upsert({
          where: { genreId_songId: { genreId, songId: song.id } },
          update: {},
          create: { genreId, songId: song.id },
        });
      }
    }
    songsWithGenres++;
  }
  console.log(`✅ Associated ${songsWithGenres} songs with genres`);

  // Associate artists with genres
  const artists = await prisma.artist.findMany({
    select: { id: true, name: true },
  });

  let artistsWithGenres = 0;
  for (const artist of artists) {
    let genres: string[] = [];
    if (artist.name.includes('Queen')) genres = ['rock', 'funk', 'opera'];
    else if (artist.name.includes('Beatles')) genres = ['rock', 'classic-rock', 'pop'];
    else if (artist.name.includes('Eagles')) genres = ['rock', 'country-rock'];
    else if (artist.name.includes('Taylor Swift')) genres = ['pop', 'country-pop'];
    else if (artist.name.includes('The Weeknd')) genres = ['r-and-b', 'electronic', 'synthwave'];

    for (const genreName of genres) {
      const genreId = createdGenres[genreName];
      if (genreId) {
        await prisma.artistGenre.upsert({
          where: { genreId_artistId: { genreId, artistId: artist.id } },
          update: {},
          create: { genreId, artistId: artist.id },
        });
      }
    }
    if (genres.length > 0) artistsWithGenres++;
  }
  console.log(`✅ Associated ${artistsWithGenres} artists with genres\n`);
}

seedGenres()
  .then(() => {
    console.log('✅ Genre seeding complete!');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  });
