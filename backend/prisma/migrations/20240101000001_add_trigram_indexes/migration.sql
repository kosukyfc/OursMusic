-- Enable pg_trgm extension for trigram-based similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on songs.title for fast ILIKE search
CREATE INDEX IF NOT EXISTS songs_title_trgm ON songs USING GIN (title gin_trgm_ops);

-- GIN trigram index on albums.title for fast ILIKE search
CREATE INDEX IF NOT EXISTS albums_title_trgm ON albums USING GIN (title gin_trgm_ops);

-- GIN trigram index on artists.name for fast ILIKE search
CREATE INDEX IF NOT EXISTS artists_name_trgm ON artists USING GIN (name gin_trgm_ops);
