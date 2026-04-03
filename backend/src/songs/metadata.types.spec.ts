import { applyMetadataDefaults, METADATA_DEFAULTS, Metadata } from './metadata.types';

describe('applyMetadataDefaults', () => {
  it('returns defaults when given an empty object', () => {
    const result = applyMetadataDefaults({});
    expect(result).toEqual(METADATA_DEFAULTS);
  });

  it('preserves all provided fields', () => {
    const full: Metadata = {
      title: 'My Song',
      artist: 'My Artist',
      album: 'My Album',
      duration: 240,
      bitrate: 320,
    };
    expect(applyMetadataDefaults(full)).toEqual(full);
  });

  it('substitutes default title when title is undefined', () => {
    const result = applyMetadataDefaults({ artist: 'Artist', album: 'Album', duration: 60, bitrate: 128 });
    expect(result.title).toBe(METADATA_DEFAULTS.title);
  });

  it('substitutes default artist when artist is undefined', () => {
    const result = applyMetadataDefaults({ title: 'Title', album: 'Album', duration: 60, bitrate: 128 });
    expect(result.artist).toBe(METADATA_DEFAULTS.artist);
  });

  it('substitutes default album when album is undefined', () => {
    const result = applyMetadataDefaults({ title: 'Title', artist: 'Artist', duration: 60, bitrate: 128 });
    expect(result.album).toBe(METADATA_DEFAULTS.album);
  });

  it('substitutes 0 for duration when duration is undefined', () => {
    const result = applyMetadataDefaults({ title: 'T', artist: 'A', album: 'B', bitrate: 128 });
    expect(result.duration).toBe(0);
  });

  it('substitutes 0 for bitrate when bitrate is undefined', () => {
    const result = applyMetadataDefaults({ title: 'T', artist: 'A', album: 'B', duration: 60 });
    expect(result.bitrate).toBe(0);
  });

  it('does not substitute when numeric fields are explicitly 0', () => {
    const result = applyMetadataDefaults({ title: 'T', artist: 'A', album: 'B', duration: 0, bitrate: 0 });
    expect(result.duration).toBe(0);
    expect(result.bitrate).toBe(0);
  });

  it('default string values match spec (Unknown Title / Unknown Artist / Unknown Album)', () => {
    expect(METADATA_DEFAULTS.title).toBe('Unknown Title');
    expect(METADATA_DEFAULTS.artist).toBe('Unknown Artist');
    expect(METADATA_DEFAULTS.album).toBe('Unknown Album');
  });
});
