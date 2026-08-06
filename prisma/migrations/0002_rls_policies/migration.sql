-- Enable Row Level Security on all user-owned tables
--
-- NOTE ON PERFORMANCE: All policies below use a subquery pattern:
--   user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text)
-- This executes a subquery per row evaluated. The users_auth_user_id_key unique
-- index ensures the subquery is an index-only scan, but at scale this will show
-- up in EXPLAIN ANALYZE. When table sizes grow significantly, consider replacing
-- with a SECURITY DEFINER function that returns the internal users.id for the
-- current auth.uid(), cached per-transaction, enabling a simple equality check:
--   user_id = get_current_user_id()
--
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_streaks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flashcards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mistake_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "note_bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resource_bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_bookmarks" ENABLE ROW LEVEL SECURITY;

-- Users: users can only access their own record
CREATE POLICY "users_select_own" ON "users"
    FOR SELECT USING (auth_user_id = auth.uid()::text);
CREATE POLICY "users_insert_own" ON "users"
    FOR INSERT WITH CHECK (auth_user_id = auth.uid()::text);
CREATE POLICY "users_update_own" ON "users"
    FOR UPDATE USING (auth_user_id = auth.uid()::text);
CREATE POLICY "users_delete_own" ON "users"
    FOR DELETE USING (auth_user_id = auth.uid()::text);

-- Notes: users can only access their own notes
CREATE POLICY "notes_select_own" ON "notes"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "notes_insert_own" ON "notes"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "notes_update_own" ON "notes"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "notes_delete_own" ON "notes"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Question Attempts: users can only access their own attempts
CREATE POLICY "question_attempts_select_own" ON "question_attempts"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_attempts_insert_own" ON "question_attempts"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_attempts_update_own" ON "question_attempts"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_attempts_delete_own" ON "question_attempts"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Question Sessions: users can only access their own sessions
CREATE POLICY "question_sessions_select_own" ON "question_sessions"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_sessions_insert_own" ON "question_sessions"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_sessions_update_own" ON "question_sessions"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_sessions_delete_own" ON "question_sessions"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Progress: users can only access their own progress
CREATE POLICY "progress_select_own" ON "progress"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "progress_insert_own" ON "progress"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "progress_update_own" ON "progress"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "progress_delete_own" ON "progress"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Study Streaks: users can only access their own streak
CREATE POLICY "study_streaks_select_own" ON "study_streaks"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "study_streaks_insert_own" ON "study_streaks"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "study_streaks_update_own" ON "study_streaks"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "study_streaks_delete_own" ON "study_streaks"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Exam Targets: users can only access their own target
CREATE POLICY "exam_targets_select_own" ON "exam_targets"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "exam_targets_insert_own" ON "exam_targets"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "exam_targets_update_own" ON "exam_targets"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "exam_targets_delete_own" ON "exam_targets"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Flashcards: users can only access their own flashcards
CREATE POLICY "flashcards_select_own" ON "flashcards"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "flashcards_insert_own" ON "flashcards"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "flashcards_update_own" ON "flashcards"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "flashcards_delete_own" ON "flashcards"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Mistake Logs: users can only access their own mistake logs
CREATE POLICY "mistake_logs_select_own" ON "mistake_logs"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "mistake_logs_insert_own" ON "mistake_logs"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "mistake_logs_update_own" ON "mistake_logs"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "mistake_logs_delete_own" ON "mistake_logs"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Question Bookmarks: users can only access their own bookmarks
CREATE POLICY "question_bookmarks_select_own" ON "question_bookmarks"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_bookmarks_insert_own" ON "question_bookmarks"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "question_bookmarks_delete_own" ON "question_bookmarks"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Note Bookmarks: users can only access their own bookmarks
CREATE POLICY "note_bookmarks_select_own" ON "note_bookmarks"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "note_bookmarks_insert_own" ON "note_bookmarks"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "note_bookmarks_delete_own" ON "note_bookmarks"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Resource Bookmarks: users can only access their own bookmarks
CREATE POLICY "resource_bookmarks_select_own" ON "resource_bookmarks"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "resource_bookmarks_insert_own" ON "resource_bookmarks"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "resource_bookmarks_delete_own" ON "resource_bookmarks"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Page Bookmarks: users can only access their own bookmarks
CREATE POLICY "page_bookmarks_select_own" ON "page_bookmarks"
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "page_bookmarks_insert_own" ON "page_bookmarks"
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "page_bookmarks_update_own" ON "page_bookmarks"
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));
CREATE POLICY "page_bookmarks_delete_own" ON "page_bookmarks"
    FOR DELETE USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()::text));

-- Read-only content tables: all authenticated users can read
ALTER TABLE "levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "readings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concepts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "formulas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "levels_read_authenticated" ON "levels"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "subjects_read_authenticated" ON "subjects"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "readings_read_authenticated" ON "readings"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "topics_read_authenticated" ON "topics"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "concepts_read_authenticated" ON "concepts"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "content_providers_read_authenticated" ON "content_providers"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "content_resources_read_authenticated" ON "content_resources"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "questions_read_authenticated" ON "questions"
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "formulas_read_authenticated" ON "formulas"
    FOR SELECT USING (auth.role() = 'authenticated');
