# Implementation Plan: CFA Buddy Phase 1

## Overview

This implementation plan breaks CFA Buddy Phase 1 into incremental coding tasks following a dependency-aware build order. The plan starts with foundational infrastructure (project scaffolding, database, auth), then builds core features (resource library, learning workspace, question import), followed by the question bank experience, and finally supporting features (mistake book, dashboard, search, responsive design). Each task builds on previous work and ends with integration wiring.

## Tasks

- [ ] 1. Project Scaffolding and Core Infrastructure
  - [ ] 1.1 Initialize Next.js 15 project with TypeScript, Tailwind CSS, and shadcn/ui
    - Create Next.js 15 app with App Router, strict TypeScript config (no implicit any, strict null checks)
    - Install and configure: Tailwind CSS, shadcn/ui, Prisma, @supabase/supabase-js, framer-motion, recharts, react-pdf, @tiptap/react, fast-check, vitest
    - Set up path aliases in tsconfig.json (`@/features/*`, `@/shared/*`, `@/scripts/*`)
    - Create feature-based directory structure: `src/features/{dashboard,learning-workspace,resource-library,question-bank,mistake-book,content-scanner,exam-countdown,search,auth}`
    - Create shared directory structure: `src/shared/{components/ui,components/layout,components/feedback,hooks,lib/supabase,lib/prisma,lib/utils,types,config}`
    - Create `src/scripts/` directory for CLI tools
    - Create `src/env.ts` with Zod-validated environment schema
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_


  - [ ] 1.2 Configure Supabase client and Prisma ORM
    - Create Supabase browser client (`src/shared/lib/supabase/client.ts`)
    - Create Supabase server client (`src/shared/lib/supabase/server.ts`)
    - Create Prisma client singleton (`src/shared/lib/prisma/client.ts`)
    - Configure DATABASE_URL for Supabase connection pooler
    - Create shared utility functions (`cn()`, `formatDate()`, etc.)
    - _Requirements: 1.2, 2.1_

  - [ ] 1.3 Create shared UI layout components
    - Build Sidebar component with navigation links to all features
    - Build Header component with search icon and user menu
    - Build protected layout (`src/app/(protected)/layout.tsx`) with sidebar + header
    - Build auth layout (`src/app/(auth)/layout.tsx`) without sidebar
    - Build root layout with theme provider and font loading
    - Build error boundary components (Root, Feature-level, Component-level)
    - Build loading/feedback components (Toast, Spinner, EmptyState)
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 2. Database Schema and Migrations
  - [ ] 2.1 Define Prisma schema for all entities
    - Define User, Level, Subject, Reading, Topic, Concept models
    - Define Content_Provider, Content_Resource models
    - Define Question model with JSONB answer_choices field
    - Define Question_Session, Question_Attempt models
    - Define Note, Formula, Flashcard models
    - Define Progress, Study_Streak, Exam_Target models
    - Define Mistake_Log model with repeat_count and persistent_weakness fields
    - Define all Bookmark models (Question_Bookmark, Note_Bookmark, Resource_Bookmark, Page_Bookmark)
    - Configure all foreign key relationships, cascade deletes, and unique constraints
    - Add `search_vector` fields for full-text search on Note, Question, Topic, Reading, Content_Resource
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21_


  - [ ] 2.2 Create database migration and seed data
    - Run `prisma migrate dev` to generate initial migration
    - Create `prisma/seed.ts` to seed Level (I, II, III) and Subject data with CFA curriculum weightings
    - Seed Content_Provider records (Curriculum, Schweser, IFT, Mark Meldrum, Fintree, UWorld, 25th Hour, Personal)
    - Create SQL migration for GIN indexes on search_vector columns
    - Create SQL migration for search vector update triggers (Notes, Questions, Topics, Readings, Content_Resources)
    - Create SQL migration for RLS policies on all user-owned tables
    - _Requirements: 2.15, 2.16, 2.17, 2.18, 2.19_

  - [ ]* 2.3 Write property test for Answer Choices JSONB round-trip
    - **Property 1: Answer Choices JSONB Round-Trip**
    - **Validates: Requirements 2.6, 2.20**

- [ ] 3. Authentication System
  - [ ] 3.1 Implement sign-up and sign-in flows
    - Create Zod validation schemas for sign-up (email, password rules, displayName 1-50 chars, level enum)
    - Create Zod validation schemas for sign-in (email, password)
    - Implement `signUp` Server Action in `src/features/auth/actions/sign-up.ts`
    - Implement `signIn` Server Action in `src/features/auth/actions/sign-in.ts`
    - Implement `signOut` Server Action in `src/features/auth/actions/sign-out.ts`
    - Build sign-up page with form validation and error display
    - Build sign-in page with generic error messaging (never reveal which field is wrong)
    - _Requirements: 3.1, 3.2, 3.3, 3.9, 3.10, 3.11_


  - [ ] 3.2 Implement auth middleware and session management
    - Create `src/middleware.ts` with Supabase session validation
    - Implement redirect logic: unauthenticated → sign-in, authenticated on auth pages → dashboard
    - Implement session token refresh before expiration
    - Create auth utility hooks (`useUser`, `useSession`)
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

  - [ ] 3.3 Implement profile management
    - Create `updateProfile` Server Action with Zod validation (displayName 1-50, level enum)
    - Build profile page at `src/app/(protected)/profile/page.tsx`
    - Display current user info with edit form
    - _Requirements: 3.8_

  - [ ]* 3.4 Write property test for auth input validation
    - **Property 2: Auth Input Validation**
    - **Validates: Requirements 3.1, 3.8**

- [ ] 4. Checkpoint - Foundation Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Content Scanner CLI
  - [ ] 5.1 Implement content scanner core logic
    - Create `src/scripts/scan-content.ts` as CLI entry point
    - Implement recursive file discovery for PDFs in content/ folder
    - Implement regex pattern registry in `src/features/content-scanner/config/patterns.ts`
    - Implement metadata extraction: level, subject, reading, provider, content type
    - Implement subject mapping configuration (abbreviations → full names)
    - Implement provider inference from folder path segments
    - Handle files not matching any pattern (content type "unknown", null metadata)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.8_


  - [ ] 5.2 Implement incremental scanning, version detection, and paired file detection
    - Implement incremental scan logic: compare file mtime against last_scan_timestamp
    - Store scan state in `content/metadata/scan-state.json`
    - Implement version detection: extract year from filenames, mark latest as active
    - Implement paired file detection: match filenames differing by " - Answers" suffix
    - Support `--full` flag for complete rescan
    - _Requirements: 11.6, 11.7, 11.9_

  - [ ] 5.3 Implement content-index.json generation and database upsert
    - Generate `content/metadata/content-index.json` with all Content_Resource records
    - Implement Supabase DB upsert logic for discovered resources
    - Add npm script: `"scan:content": "tsx src/scripts/scan-content.ts"`
    - Report scan results: files processed, new files, errors
    - _Requirements: 11.5, 11.10, 11.12_

  - [ ] 5.4 Implement scanner API route and admin status view
    - Create POST `/api/scanner` route to trigger scan from admin UI
    - Create GET `/api/scanner` route to return scan status
    - Build admin scanner page at `src/app/(protected)/admin/scanner/page.tsx`
    - Display Import Status: files per content type, metadata resolution %, questions imported vs estimated, per-provider completion
    - _Requirements: 11.11, 11.13_

  - [ ]* 5.5 Write property tests for content scanner
    - **Property 13: Content Scanner Metadata Extraction**
    - **Validates: Requirements 11.2, 11.3, 11.4**

  - [ ]* 5.6 Write property test for incremental scan file selection
    - **Property 14: Incremental Scan File Selection**
    - **Validates: Requirements 11.6**

  - [ ]* 5.7 Write property test for version detection
    - **Property 15: Version Detection**
    - **Validates: Requirements 11.7**

  - [ ]* 5.8 Write property test for paired file detection
    - **Property 16: Paired File Detection**
    - **Validates: Requirements 11.9**


- [ ] 6. Resource Library
  - [ ] 6.1 Implement resource browsing and hierarchy
    - Create `getResources` query with filters (level, subject, reading, provider)
    - Create `getResource` query returning resource detail + signed URL
    - Build resource browser page at `src/app/(protected)/resources/page.tsx`
    - Display hierarchy: Level → Subject → Reading → Provider
    - Show file metadata: name (truncated 80 chars), size, type, provider, reading
    - _Requirements: 6.1, 6.5, 6.9_

  - [ ] 6.2 Implement PDF viewer with react-pdf
    - Build PDF viewer component at `src/features/resource-library/components/PdfViewer.tsx`
    - Implement page-at-a-time rendering for large documents (up to 6000 pages)
    - Add page navigation controls (prev/next, jump to page)
    - Add zoom controls (25% to 400%)
    - Add scroll controls
    - Handle load errors with retry button
    - _Requirements: 6.2, 6.7_

  - [ ] 6.3 Implement file upload and page bookmarks
    - Create `uploadResource` Server Action with validation (100MB max, PDF only, magic byte check)
    - Create `savePageBookmark` Server Action to persist last viewed page
    - Create `getPageBookmark` query to retrieve last page on reopen
    - Build upload UI with error handling (preserve file selection on failure, retry)
    - Store uploads in Supabase Storage under user-specific path
    - Support Video resources as URL links (opens in new tab)
    - _Requirements: 6.3, 6.4, 6.6, 6.8, 6.10_

- [ ] 7. Learning Workspace
  - [ ] 7.1 Implement curriculum hierarchy navigation
    - Create queries: `getSubjects(levelId)`, `getReadings(subjectId)`, `getTopicDetail(topicId, userId)`
    - Build Level selection page at `src/app/(protected)/learn/page.tsx`
    - Build Subject listing at `src/app/(protected)/learn/[subjectId]/page.tsx`
    - Build Reading detail at `src/app/(protected)/learn/[subjectId]/[readingId]/page.tsx`
    - Display provider tabs (Curriculum, Schweser, IFT, Mark Meldrum, Fintree, Personal)
    - Show all Concepts within selected Topic with linked resources
    - Display progress indicators per Reading (Topics studied %, questions attempted, notes count)
    - _Requirements: 5.1, 5.2, 5.5, 5.8, 5.9, 5.11_


  - [ ] 7.2 Implement notes CRUD with rich text editor
    - Install and configure Tiptap editor with extensions (headings 1-3, lists, bold, italic, code blocks, math)
    - Create `createNote`, `updateNote`, `deleteNote` Server Actions with Zod validation (max 50,000 chars, max 20 notes per topic)
    - Build Personal Notes section component with create/edit/delete UI
    - Implement error handling: preserve unsaved content on failure
    - Display "last studied" timestamp per Topic
    - Display question count and accuracy per Topic
    - _Requirements: 5.3, 5.4, 5.7, 5.8, 5.10_

  - [ ] 7.3 Implement Quick Topic Test launcher
    - Create "Quick Topic Test" button in Topic view
    - Wire to Question_Bank session creation: 10 questions, untimed, filtered to current Topic
    - _Requirements: 5.6_

- [ ] 8. Question Import Pipeline
  - [ ] 8.1 Implement text extraction and question parsing
    - Install pdf-parse for text extraction
    - Create `src/scripts/import-questions.ts` CLI entry point
    - Implement page-by-page text extraction from PDF
    - Implement question boundary detection (number patterns: "1.", "Q1.", "Question 1")
    - Implement answer choice parsing (letter patterns: "A.", "B.", "C.")
    - Implement explanation/correct answer extraction ("Explanation:", "Answer:", "Correct Answer:")
    - Handle paired Q/A files: correlate by reading number + question number
    - Store provenance: source file, extraction timestamp, verification status
    - Handle extraction failures (image-based/encrypted PDFs) with descriptive errors
    - Detect duplicate questions (matching text + provider)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7, 12.8, 12.9, 12.10_


  - [ ] 8.2 Build question verification UI
    - Build admin import page at `src/app/(protected)/admin/import/page.tsx`
    - Display extracted candidates in a verification queue
    - Allow User to review, edit, approve, or reject each question
    - Show batch progress: total extracted, approved, rejected, pending
    - Wire approved questions to database insert
    - _Requirements: 12.5, 12.6, 12.7_

  - [ ]* 8.3 Write property test for question boundary parsing
    - **Property 17: Question Boundary Parsing**
    - **Validates: Requirements 12.2**

- [ ] 9. Checkpoint - Core Features Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Question Bank - Session Management
  - [ ] 10.1 Implement session creation and configuration
    - Create `createSession` Server Action supporting all Test_Mode options (Topic, Subject, Mixed, Quick Topic, Adaptive Retest, Random, Weak Topic)
    - Implement question selection logic per mode:
      - Topic Test: filter by topic, default 20 questions
      - Subject Test: filter by subject, default 40 questions
      - Mixed Test: across all topics, default 90 questions
      - Quick Topic Test: filter by reading, 10 questions untimed
      - Adaptive Retest: only incorrect/slow/guess questions, deduped
      - Random: random selection across all available
      - Weak Topic: from 5 weakest topics by accuracy
    - Validate question count (min 5, max 180)
    - Validate timer configuration (min 5 min, max 270 min, default 90)
    - Build session configuration UI at `src/app/(protected)/questions/page.tsx`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_


  - [ ] 10.2 Implement session persistence and resume
    - Create `getSessionState` query returning questions, attempts, flags, bookmarks
    - Create `getIncompleteSession` query to find resumable sessions (within 7-day expiry)
    - Implement auto-save on navigation away (within 2 seconds)
    - Build session resume prompt in Question Bank UI
    - _Requirements: 7.27, 7.34_

  - [ ]* 10.3 Write property test for adaptive retest question selection
    - **Property 7: Adaptive Retest Question Selection**
    - **Validates: Requirements 7.5**

  - [ ]* 10.4 Write property test for question filter composition
    - **Property 8: Question Filter Composition (Intersection)**
    - **Validates: Requirements 7.26**

- [ ] 11. Question Bank - Test Experience
  - [ ] 11.1 Implement active test UI with confidence submit buttons
    - Build active test page at `src/app/(protected)/questions/session/[sessionId]/page.tsx`
    - Render question text and answer choices from JSONB array (variable counts)
    - Build three confidence submit buttons: [Guess ▶], [Think So ▶], [Certain ▶]
    - Single-click submits answer + records confidence simultaneously
    - Implement per-question timer (start on display, stop on submit)
    - Implement question navigation panel showing answered/flagged/current
    - _Requirements: 7.8, 7.9, 7.10_

  - [ ] 11.2 Implement bookmark, flag, and scratchpad features
    - Create `toggleQuestionBookmark` Server Action (persists after session ends)
    - Create `toggleFlag` Server Action (session-scoped, visual indicator in nav panel)
    - Implement Scratchpad component with localStorage per question (cleared on session end)
    - _Requirements: 7.11, 7.12, 7.13_


  - [ ] 11.3 Implement timed and untimed mode logic
    - Implement countdown timer for Timed mode (auto-submit on expiry)
    - Withhold correctness/explanations in Timed mode until test submitted
    - In Untimed mode: proceed to Review_Flow within 1 second of submit
    - Create `submitAnswer` Server Action recording answer, confidence, time, correctness
    - Create `completeSession` Server Action computing summary + confidence matrix
    - _Requirements: 7.14, 7.15, 7.23_

  - [ ] 11.4 Implement question filtering
    - Build filter UI with all filter options: difficulty, provider, topic, subject, completion status, bookmark status, time performance, confidence-correctness category
    - Implement filter intersection logic (all filters applied simultaneously)
    - Wire filters to session configuration
    - _Requirements: 7.26_

- [ ] 12. Question Bank - Review Flow
  - [ ] 12.1 Implement 3-state Review Flow
    - Build Review Flow component with three states:
      - State 1: User's answer highlighted with correct/incorrect indicator
      - State 2 (Reveal): Correct answer highlighted + explanation + formula
      - State 3 (Actions): Create Flashcard button, Add Note button, Classify Error button (if incorrect)
    - Implement "Skip to Actions" control from State 1 → State 3
    - Build review page at `src/app/(protected)/questions/review/[sessionId]/page.tsx`
    - _Requirements: 7.16, 7.17, 7.18, 7.19_

  - [ ] 12.2 Implement review actions (flashcard creation, notes, error classification)
    - Create Flashcard action: question as front, correct answer + explanation as back
    - Create inline note editor attached to question (max 2000 chars, persisted)
    - Create Error_Classification prompt with options: Didn't Know, Forgot Formula, Calculation Mistake, Misread Question, Careless, Time Pressure
    - Allow skip (records as "Unclassified")
    - Create `addQuestionNote` Server Action
    - _Requirements: 7.18, 7.22, 10.1, 10.2_


  - [ ]* 12.3 Write property test for confidence matrix classification
    - **Property 6: Confidence Matrix Classification**
    - **Validates: Requirements 7.20**

- [ ] 13. Question Bank - Analytics and Summary
  - [ ] 13.1 Implement test summary and session recording
    - Build test summary view: total questions, correct, accuracy %, avg time, topic breakdown
    - Display Confidence_Matrix as visual overlay (6 categories with counts + percentages)
    - Display time distribution chart (per-question times using Recharts)
    - Store attempt history per session for attempt-over-attempt comparison
    - _Requirements: 7.20, 7.21, 7.24, 7.25_

  - [ ] 13.2 Implement question bank analytics
    - Compute per-question stats: correct rate %, avg time, most common wrong answer
    - Compute confidence calibration: % of Certain answers that were correct
    - Compute guess rate: % of answers with Guess confidence
    - Compute Topic-level weakness analysis: rank topics by accuracy + avg time, show 10 weakest
    - Build attempt comparison over time for Topic/Subject (accuracy + confidence distribution)
    - Build progress timeline: monthly accuracy trend line chart (12 months)
    - Handle loading errors with retry action
    - _Requirements: 7.28, 7.29, 7.30, 7.31, 7.32, 7.33, 7.35_

- [ ] 14. Checkpoint - Question Bank Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Mistake Book
  - [ ] 15.1 Implement mistake logging and auto-creation
    - Create trigger/hook to auto-create Mistake_Log entry on every incorrect Question_Attempt
    - Store: question ref, selected answer, correct answer, classification, confidence, time, topic, timestamp
    - Implement repeat_count increment on subsequent incorrect attempts for same question
    - Implement persistent_weakness flag when repeat_count >= 3
    - _Requirements: 10.4, 10.14, 10.15_


  - [ ] 15.2 Implement mistake book UI and filtering
    - Build mistake book page at `src/app/(protected)/mistakes/page.tsx`
    - Display chronological mistake log with summary cards (question preview 100 chars, classification badge, confidence badge, time, topic)
    - Implement filters: Error_Classification, Subject, Topic, Provider, date range, Confidence_Matrix category
    - Allow classification update on existing mistakes
    - On mistake entry selection: show full Review_Flow from State 1
    - Handle network errors: queue classification locally, retry on reconnect
    - _Requirements: 10.3, 10.5, 10.6, 10.7, 10.17_

  - [ ] 15.3 Implement error pattern analytics
    - Compute error type breakdown as donut chart (% per classification category)
    - Compute error trends: weekly counts per classification as stacked bar chart (12 weeks)
    - Identify dominant error pattern (highest count in last 30 days) with recommendation
    - Compute Misconception ratio (Incorrect + Certain / total incorrect), flag if > 25%
    - _Requirements: 10.8, 10.9, 10.10, 10.11_

  - [ ] 15.4 Implement targeted retest from mistakes
    - Create `generateRetest` Server Action: select questions from mistake log
    - Apply filters: Error_Classification category, count (min 5, max 100)
    - No duplicate questions in result set
    - On correct answer in retest: mark mistake as "Resolved" (retain record)
    - Wire to Question_Bank session creation
    - _Requirements: 10.12, 10.13_

  - [ ]* 15.5 Write property test for error analytics percentages
    - **Property 10: Error Analytics Percentages**
    - **Validates: Requirements 10.8, 10.10**

  - [ ]* 15.6 Write property test for mistake retest generation
    - **Property 11: Mistake Retest Generation**
    - **Validates: Requirements 10.12**

  - [ ]* 15.7 Write property test for repeat count and persistent weakness
    - **Property 12: Repeat Count and Persistent Weakness Flag**
    - **Validates: Requirements 10.14**


- [ ] 16. Dashboard and Analytics
  - [ ] 16.1 Implement hero metrics queries
    - Create `getHeroMetrics` query: Exam_Readiness, overall accuracy, current streak, review due count, weakest 3 topics, weekly progress (7-day bar chart data), recent activity (last 5 actions)
    - Implement Exam_Readiness computation: ratio of topics at mastery, overall accuracy, streak vs 30-day baseline
    - Implement Study_Streak computation: consecutive calendar days with activity
    - Build hero metrics section with 7 metrics displayed
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 16.2 Implement advanced analytics section
    - Create `getAdvancedAnalytics` query: estimated score, avg time, strong topics, totals, confidence calibration
    - Implement Estimated Exam Score: accuracy weighted by CFA curriculum topic weights
    - Build expandable Advanced Analytics section with all metrics
    - Display strongest topics (top 5 by mastery), totals (questions, sessions, hours), confidence calibration
    - _Requirements: 4.8, 4.9, 4.10, 4.11, 4.12_

  - [ ] 16.3 Implement dashboard states and error handling
    - Build onboarding state: guided prompts when no study data exists
    - Build insufficient data state: show "unavailable" for Readiness/Score when < 10 questions
    - Build error state with retry action
    - Ensure all data is fresh (no stale cache — loaded per page request)
    - Build weekly progress bar chart (Recharts) and recent activity feed
    - _Requirements: 4.13, 4.14, 4.15, 4.16_

  - [ ]* 16.4 Write property test for exam readiness bounds
    - **Property 3: Exam Readiness Computation Bounds**
    - **Validates: Requirements 4.1**

  - [ ]* 16.5 Write property test for study streak computation
    - **Property 4: Study Streak Computation**
    - **Validates: Requirements 4.3**

  - [ ]* 16.6 Write property test for analytics metrics bounds
    - **Property 5: Analytics Metrics Produce Valid Bounded Outputs**
    - **Validates: Requirements 4.2, 4.8, 4.9, 4.12**


- [ ] 17. Exam Countdown and Pacing
  - [ ] 17.1 Implement exam target and pacing computation
    - Create `setExamTarget` Server Action with validation (date must be future)
    - Create `getPacing` query: days remaining, topics per day, questions per day, weekly target, pacing status
    - Implement pacing indicator: ahead (>110%), on track (90-110%), behind (<90%)
    - Build exam countdown display on Dashboard
    - Build urgent visual indicator when exam < 30 days away
    - Build empty state with prompt to set exam date
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ]* 17.2 Write property test for pacing computation
    - **Property 18: Pacing Computation and Classification**
    - **Validates: Requirements 13.3, 13.4, 13.5, 13.6**

- [ ] 18. Global Search
  - [ ] 18.1 Implement full-text search API and modal
    - Create GET `/api/search` route querying all searchable tables with tsquery
    - Implement parallel queries across Notes, Questions, Resources, Topics, Readings
    - Rank results by ts_rank relevance
    - Group results by type (max 5 per group, expandable)
    - Build search modal component with Cmd/Ctrl+K keyboard shortcut
    - Implement debounced input (300ms)
    - Navigate to content page on result selection
    - Handle empty state and search unavailable error
    - Highlight matching text in results
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 18.2 Write property test for search result grouping
    - **Property 9: Search Result Grouping**
    - **Validates: Requirements 8.3**

- [ ] 19. Checkpoint - All Features Complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 20. Responsive Design, Theming, and Keyboard Navigation
  - [ ] 20.1 Implement dark/light theme and responsive layout
    - Configure dark theme as default with theme toggle (persisted in localStorage)
    - Implement responsive breakpoints: desktop (≥1024px), tablet (768-1023px), mobile (<768px)
    - Ensure all interactive elements have min 44×44px touch targets on mobile
    - Verify WCAG 2.1 AA contrast ratios in both themes (4.5:1 text, 3:1 large/interactive)
    - Implement Framer Motion animations (page transitions, mounts, feedback) 150-300ms
    - Respect prefers-reduced-motion: disable animations when OS setting is active
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 20.2 Implement keyboard navigation shortcuts
    - Implement shortcuts: j/k (list navigation), / (focus search), b (toggle bookmark), n (new note), Enter (open item), Esc (close modal/back)
    - Suppress shortcuts when text input/textarea is focused
    - Build keyboard shortcut reference modal triggered by "?" key
    - _Requirements: 9.7, 9.8, 9.9_

- [ ] 21. Performance Optimization and Deployment Configuration
  - [ ] 21.1 Implement performance optimizations
    - Configure ISR for content hierarchy pages (revalidate 1 hour)
    - Add Suspense boundaries with `loading.tsx` for streaming
    - Implement cursor-based pagination for all list queries
    - Configure dynamic imports for feature modules (bundle splitting)
    - Optimize PDF viewer with lazy page rendering
    - Configure next/image for any UI images
    - _Requirements: 6.2, 4.16_

  - [ ] 21.2 Configure deployment (Vercel + Supabase)
    - Create `vercel.json` configuration (framework, build command, region)
    - Configure all environment variables for production
    - Set up Prisma migration deployment pipeline (`prisma migrate deploy`)
    - Verify free tier limits: DB <500MB, Storage <1GB, Bandwidth <100GB
    - _Requirements: 1.1_

- [ ] 22. Final Checkpoint - Integration and Polish
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All mutations use Server Actions (no REST endpoints except search and scanner)
- The Content Scanner is a Node.js CLI script (`npm run scan:content`)
- PDF viewing is client-side only (react-pdf/pdf.js)
- Scratchpad uses localStorage only
- No AI features in Phase 1
- No Flashcard management beyond basic creation from Review Flow
- No Formula Center, Revision Planner in Phase 1


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["3.1", "3.2"] },
    { "id": 5, "tasks": ["3.3", "3.4"] },
    { "id": 6, "tasks": ["5.1", "6.1"] },
    { "id": 7, "tasks": ["5.2", "5.3", "6.2", "6.3", "7.1"] },
    { "id": 8, "tasks": ["5.4", "5.5", "5.6", "5.7", "5.8", "7.2", "7.3"] },
    { "id": 9, "tasks": ["8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3"] },
    { "id": 11, "tasks": ["10.1"] },
    { "id": 12, "tasks": ["10.2", "10.3", "10.4"] },
    { "id": 13, "tasks": ["11.1", "11.2"] },
    { "id": 14, "tasks": ["11.3", "11.4"] },
    { "id": 15, "tasks": ["12.1"] },
    { "id": 16, "tasks": ["12.2", "12.3"] },
    { "id": 17, "tasks": ["13.1", "13.2"] },
    { "id": 18, "tasks": ["15.1"] },
    { "id": 19, "tasks": ["15.2", "15.3", "15.4"] },
    { "id": 20, "tasks": ["15.5", "15.6", "15.7"] },
    { "id": 21, "tasks": ["16.1", "17.1"] },
    { "id": 22, "tasks": ["16.2", "16.3", "17.2"] },
    { "id": 23, "tasks": ["16.4", "16.5", "16.6"] },
    { "id": 24, "tasks": ["18.1"] },
    { "id": 25, "tasks": ["18.2", "20.1"] },
    { "id": 26, "tasks": ["20.2"] },
    { "id": 27, "tasks": ["21.1", "21.2"] }
  ]
}
```
