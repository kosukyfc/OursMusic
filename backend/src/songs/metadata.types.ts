/**
 * Structured representation of audio file metadata tags (ID3/Vorbis).
 * Requirement 18: Audio Metadata Parser/Serializer
 */
export interface Metadata {
  title: string;
  artist: string;
  album: string;
  /** Duration in whole seconds */
  duration: number;
  /** Bitrate in kbps */
  bitrate: number;
}

/**
 * Default values applied when a metadata field is absent from the audio file.
 * Requirement 18.2: missing string fields → "Unknown *", numeric fields → 0
 */
export const METADATA_DEFAULTS: Readonly<Metadata> = {
  title: 'Unknown Title',
  artist: 'Unknown Artist',
  album: 'Unknown Album',
  duration: 0,
  bitrate: 0,
};

/**
 * Applies default substitution for any missing (null/undefined) fields in a
 * partial metadata object, returning a fully-populated Metadata value.
 *
 * @param partial - Raw metadata values, potentially with missing fields
 * @returns A complete Metadata object with defaults filled in
 */
export function applyMetadataDefaults(partial: Partial<Metadata>): Metadata {
  return {
    title: partial.title ?? METADATA_DEFAULTS.title,
    artist: partial.artist ?? METADATA_DEFAULTS.artist,
    album: partial.album ?? METADATA_DEFAULTS.album,
    duration: partial.duration ?? METADATA_DEFAULTS.duration,
    bitrate: partial.bitrate ?? METADATA_DEFAULTS.bitrate,
  };
}
