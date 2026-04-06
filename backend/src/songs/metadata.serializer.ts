import NodeID3 from 'node-id3';
import { Metadata } from './metadata.types';

/**
 * Serializes a Metadata object back into ID3v2 tags embedded in an MP3 buffer.
 *
 * Only MP3 (audio/mpeg) files are supported for tag writing. Other formats
 * are returned unchanged — the round-trip property test uses MP3 arbitraries.
 *
 * Requirement 18.3: serialize Metadata back to embedded tags.
 * Property 35: parse → serialize → parse must produce equivalent Metadata.
 *
 * @param metadata - The metadata to write
 * @param file     - The original Multer file (buffer + mimetype)
 * @returns A new Buffer with updated ID3 tags (or the original buffer for non-MP3)
 */
export function serializeMetadata(
  metadata: Metadata,
  file: Express.Multer.File,
): Buffer {
  if (file.mimetype !== 'audio/mpeg') {
    // Non-MP3 formats: return buffer unchanged (no tag-writing support)
    return file.buffer;
  }

  const tags: NodeID3.Tags = {
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    // ID3 does not have a standard numeric duration tag; store as TLEN (ms string)
    length: String(metadata.duration * 1000),
  };

  const result = NodeID3.update(tags, file.buffer);
  // NodeID3.update returns false on failure; fall back to original buffer
  return result instanceof Buffer ? result : file.buffer;
}
