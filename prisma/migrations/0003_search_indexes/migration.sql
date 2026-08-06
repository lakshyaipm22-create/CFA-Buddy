-- Full-text search support with tsvector columns and GIN indexes

-- Notes: search on content
ALTER TABLE "notes" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;
CREATE INDEX "notes_search_idx" ON "notes" USING GIN ("search_vector");

-- Questions: search on question_text
ALTER TABLE "questions" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(question_text, ''))) STORED;
CREATE INDEX "questions_search_idx" ON "questions" USING GIN ("search_vector");

-- Topics: search on name and los_code
ALTER TABLE "topics" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(los_code, ''))) STORED;
CREATE INDEX "topics_search_idx" ON "topics" USING GIN ("search_vector");

-- Readings: search on name
ALTER TABLE "readings" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED;
CREATE INDEX "readings_search_idx" ON "readings" USING GIN ("search_vector");

-- Content Resources: search on file_path
ALTER TABLE "content_resources" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(file_path, ''))) STORED;
CREATE INDEX "content_resources_search_idx" ON "content_resources" USING GIN ("search_vector");

-- Concepts: search on name and description
ALTER TABLE "concepts" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED;
CREATE INDEX "concepts_search_idx" ON "concepts" USING GIN ("search_vector");
