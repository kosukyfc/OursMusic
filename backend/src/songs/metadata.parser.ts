import * as mm from 'music-metadata';
import { Metadata, applyMetadataDefaults } from './metadata.types';

/**
 * Parses embedded audio metadata tags (ID3/Vorbis) from an uploaded file.
 *
 * Uses `music-metadata` to extract title, artist, album, duration, and bitrate.
 * Any missing fields are filled with defaults via `applyMetadataDefaults`.
 *
 * Requirement 18.1: parse embedded metadata tags into a structured Metadata object.
 * Requirement 18.2: substitute defaults for missing fields.
 *
 * @param file - The uploaded file from Express/Multer
 * @returns A fully-populated Metadata object
 */
export async function parseMetadata(file: Express.Multer.File): Promise<Metadata> {
  const parsed = await mm.parseBuffer(file.buffer, { mimeType: file.mimetype });
  const { common, format } = parsed;

  return applyMetadataDefaults({
    title: common.title,
    artist: common.artist,
    album: common.album,
    duration: format.duration != null ? Math.round(format.duration) : undefined,
    bitrate: format.bitrate != null ? Math.round(format.bitrate / 1000) : undefined,
  });
}
