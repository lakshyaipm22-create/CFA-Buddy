-- CreateEnum
CREATE TYPE "CfaLevel" AS ENUM ('I', 'II', 'III');
CREATE TYPE "Difficulty" AS ENUM ('Easy', 'Medium', 'Hard');
CREATE TYPE "Confidence" AS ENUM ('Guess', 'ThinkSo', 'Certain');
CREATE TYPE "ErrorClassification" AS ENUM ('DidntKnow', 'ForgotFormula', 'CalculationMistake', 'MisreadQuestion', 'Careless', 'TimePressure', 'Unclassified');
CREATE TYPE "ContentType" AS ENUM ('PDF', 'VideoLink', 'FormulaSheet', 'Unknown');
CREATE TYPE "SessionStatus" AS ENUM ('Active', 'Completed', 'Abandoned');
CREATE TYPE "TestMode" AS ENUM ('Topic', 'Subject', 'Mixed', 'QuickTopic', 'AdaptiveRetest', 'Random', 'WeakTopic');

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "level" "CfaLevel" NOT NULL DEFAULT 'I',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");

-- CreateTable: levels
CREATE TABLE "levels" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" "CfaLevel" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "levels_name_key" ON "levels"("name");

-- CreateTable: subjects
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "level_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 0,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "subjects_level_id_idx" ON "subjects"("level_id");

-- CreateTable: readings
CREATE TABLE "readings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "subject_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reading_number" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "readings_subject_id_idx" ON "readings"("subject_id");

-- CreateTable: topics
CREATE TABLE "topics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "reading_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "los_code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "topics_reading_id_idx" ON "topics"("reading_id");

-- CreateTable: concepts
CREATE TABLE "concepts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "topic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "concepts_topic_id_idx" ON "concepts"("topic_id");

-- CreateTable: content_providers
CREATE TABLE "content_providers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "content_providers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_providers_name_key" ON "content_providers"("name");
CREATE UNIQUE INDEX "content_providers_slug_key" ON "content_providers"("slug");

-- CreateTable: content_resources
CREATE TABLE "content_resources" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "level_id" TEXT,
    "subject_id" TEXT,
    "reading_id" TEXT,
    "provider_id" TEXT,
    "file_path" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL DEFAULT 'Unknown',
    "file_size_bytes" BIGINT,
    "version" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paired_resource_id" TEXT,
    CONSTRAINT "content_resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "content_resources_level_id_subject_id_provider_id_idx" ON "content_resources"("level_id", "subject_id", "provider_id");
CREATE INDEX "content_resources_file_path_idx" ON "content_resources"("file_path");

-- CreateTable: questions
CREATE TABLE "questions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "concept_id" TEXT,
    "topic_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "answer_choices" JSONB NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'Medium',
    "question_source_file" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "questions_topic_id_concept_id_idx" ON "questions"("topic_id", "concept_id");
CREATE INDEX "questions_provider_id_idx" ON "questions"("provider_id");
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");

-- CreateTable: question_sessions
CREATE TABLE "question_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "mode" "TestMode" NOT NULL,
    "config" JSONB NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'Active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "total_questions" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "question_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "question_sessions_user_id_status_idx" ON "question_sessions"("user_id", "status");
CREATE INDEX "question_sessions_expires_at_idx" ON "question_sessions"("expires_at");

-- CreateTable: question_attempts
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "selected_answer" TEXT NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "time_spent_seconds" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "error_classification" "ErrorClassification",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "question_attempts_user_id_created_at_idx" ON "question_attempts"("user_id", "created_at");
CREATE INDEX "question_attempts_question_id_idx" ON "question_attempts"("question_id");
CREATE INDEX "question_attempts_session_id_idx" ON "question_attempts"("session_id");

-- CreateTable: notes
CREATE TABLE "notes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "concept_id" TEXT,
    "question_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notes_user_id_topic_id_idx" ON "notes"("user_id", "topic_id");
CREATE INDEX "notes_user_id_question_id_idx" ON "notes"("user_id", "question_id");

-- CreateTable: formulas
CREATE TABLE "formulas" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "concept_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "formulas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "formulas_concept_id_idx" ON "formulas"("concept_id");

-- CreateTable: flashcards
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "concept_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "next_review" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "ease_factor" DECIMAL(65,30) NOT NULL DEFAULT 2.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "flashcards_user_id_next_review_idx" ON "flashcards"("user_id", "next_review");
CREATE INDEX "flashcards_concept_id_idx" ON "flashcards"("concept_id");

-- CreateTable: progress
CREATE TABLE "progress" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "mastery_level" INTEGER NOT NULL DEFAULT 0,
    "questions_attempted" INTEGER NOT NULL DEFAULT 0,
    "questions_correct" INTEGER NOT NULL DEFAULT 0,
    "last_studied" TIMESTAMP(3),
    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "progress_user_id_topic_id_key" ON "progress"("user_id", "topic_id");
CREATE INDEX "progress_user_id_mastery_level_idx" ON "progress"("user_id", "mastery_level");

-- CreateTable: study_streaks
CREATE TABLE "study_streaks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "streak_start_date" TIMESTAMP(3),
    "last_study_date" TIMESTAMP(3),
    CONSTRAINT "study_streaks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "study_streaks_user_id_key" ON "study_streaks"("user_id");

-- CreateTable: exam_targets
CREATE TABLE "exam_targets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "target_level" "CfaLevel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_targets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exam_targets_user_id_key" ON "exam_targets"("user_id");

-- CreateTable: mistake_logs
CREATE TABLE "mistake_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "concept_id" TEXT,
    "topic_id" TEXT NOT NULL,
    "error_classification" "ErrorClassification" NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "repeat_count" INTEGER NOT NULL DEFAULT 0,
    "persistent_weakness" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mistake_logs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mistake_logs_attempt_id_key" ON "mistake_logs"("attempt_id");
CREATE INDEX "mistake_logs_user_id_error_classification_idx" ON "mistake_logs"("user_id", "error_classification");
CREATE INDEX "mistake_logs_user_id_topic_id_idx" ON "mistake_logs"("user_id", "topic_id");
CREATE INDEX "mistake_logs_user_id_resolved_idx" ON "mistake_logs"("user_id", "resolved");

-- CreateTable: question_bookmarks
CREATE TABLE "question_bookmarks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_bookmarks_user_id_question_id_key" ON "question_bookmarks"("user_id", "question_id");

-- CreateTable: note_bookmarks
CREATE TABLE "note_bookmarks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "note_bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "note_bookmarks_user_id_note_id_key" ON "note_bookmarks"("user_id", "note_id");

-- CreateTable: resource_bookmarks
CREATE TABLE "resource_bookmarks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resource_bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "resource_bookmarks_user_id_resource_id_key" ON "resource_bookmarks"("user_id", "resource_id");

-- CreateTable: page_bookmarks
CREATE TABLE "page_bookmarks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "page_bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "page_bookmarks_user_id_resource_id_key" ON "page_bookmarks"("user_id", "resource_id");

-- AddForeignKey: subjects -> levels
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: readings -> subjects
ALTER TABLE "readings" ADD CONSTRAINT "readings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: topics -> readings
ALTER TABLE "topics" ADD CONSTRAINT "topics_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "readings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: concepts -> topics
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: content_resources -> content_providers
ALTER TABLE "content_resources" ADD CONSTRAINT "content_resources_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "content_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: questions -> concepts
ALTER TABLE "questions" ADD CONSTRAINT "questions_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: questions -> topics
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: questions -> content_providers
ALTER TABLE "questions" ADD CONSTRAINT "questions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "content_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: question_sessions -> users
ALTER TABLE "question_sessions" ADD CONSTRAINT "question_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: question_attempts -> question_sessions
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "question_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: question_attempts -> questions
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: question_attempts -> users
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notes -> users
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notes -> topics
ALTER TABLE "notes" ADD CONSTRAINT "notes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notes -> concepts
ALTER TABLE "notes" ADD CONSTRAINT "notes_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: notes -> questions
ALTER TABLE "notes" ADD CONSTRAINT "notes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: formulas -> concepts
ALTER TABLE "formulas" ADD CONSTRAINT "formulas_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: flashcards -> concepts
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: flashcards -> users
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: progress -> users
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: progress -> topics
ALTER TABLE "progress" ADD CONSTRAINT "progress_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: study_streaks -> users
ALTER TABLE "study_streaks" ADD CONSTRAINT "study_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: exam_targets -> users
ALTER TABLE "exam_targets" ADD CONSTRAINT "exam_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: mistake_logs -> question_attempts
ALTER TABLE "mistake_logs" ADD CONSTRAINT "mistake_logs_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "question_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: mistake_logs -> users
ALTER TABLE "mistake_logs" ADD CONSTRAINT "mistake_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: mistake_logs -> concepts
ALTER TABLE "mistake_logs" ADD CONSTRAINT "mistake_logs_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: mistake_logs -> topics
ALTER TABLE "mistake_logs" ADD CONSTRAINT "mistake_logs_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: question_bookmarks -> users
ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: question_bookmarks -> questions
ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: note_bookmarks -> users
ALTER TABLE "note_bookmarks" ADD CONSTRAINT "note_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: note_bookmarks -> notes
ALTER TABLE "note_bookmarks" ADD CONSTRAINT "note_bookmarks_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: resource_bookmarks -> users
ALTER TABLE "resource_bookmarks" ADD CONSTRAINT "resource_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: resource_bookmarks -> content_resources
ALTER TABLE "resource_bookmarks" ADD CONSTRAINT "resource_bookmarks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "content_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: page_bookmarks -> users
ALTER TABLE "page_bookmarks" ADD CONSTRAINT "page_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: page_bookmarks -> content_resources
ALTER TABLE "page_bookmarks" ADD CONSTRAINT "page_bookmarks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "content_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
