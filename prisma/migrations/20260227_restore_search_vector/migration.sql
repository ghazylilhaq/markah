-- Restore tsvector generated column for full-text search
ALTER TABLE "Bookmark" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("url", '')), 'C')
  ) STORED;

-- Recreate GIN index for fast full-text search
CREATE INDEX "Bookmark_search_vector_idx" ON "Bookmark" USING GIN ("search_vector");
