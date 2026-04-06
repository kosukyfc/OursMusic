import * as fc from 'fast-check';
import NodeID3 from 'node-id3';
import { parseMetadata } from './metadata.parser';
import { serializeMetadata } from './metadata.serializer';

// Minimal silent MPEG Layer 3 frame (128 kbps, 44100 Hz, stereo) — reused across runs
const SILENT_FRAME = Buffer.from([
  0xff, 0xfb, 0x90, 0x00, // sync + header
  ...new Array(413).fill(0x00),
]);

/**
 * Builds a minimal valid MP3 buffer with ID3v2 tags injected.
 */
function buildMp3WithTags(tags: NodeID3.Tags): Buffer {
  const result = NodeID3.write(tags, SILENT_FRAME);
  return result instanceof Buffer ? result : SILENT_FRAME;
}

function makeFile(buffer: Buffer): Express.Multer.File {
  return {
    buffer,
    mimetype: 'audio/mpeg',
    originalname: 'test.mp3',
    fieldname: 'file',
    encoding: '7bit',
    size: buffer.length,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };
}

// Feature: music-streaming-app, Property 35: Audio metadata parse–serialize round-trip
describe('Property 35: parse → serialize → parse round-trip', () => {
  it('produces equivalent Metadata for any valid MP3 with ID3 tags', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          artist: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          album: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        }),
        async ({ title, artist, album }) => {
          const tags: NodeID3.Tags = { title, artist, album };
          const buffer = buildMp3WithTags(tags);
          const file = makeFile(buffer);

          const first = await parseMetadata(file);
          const serializedBuffer = serializeMetadata(first, file);
          const serializedFile = makeFile(serializedBuffer);
          const second = await parseMetadata(serializedFile);

          expect(second.title).toBe(first.title);
          expect(second.artist).toBe(first.artist);
          expect(second.album).toBe(first.album);
        },
      ),
      { numRuns: 20 },
    );
  }, 120_000);
});
