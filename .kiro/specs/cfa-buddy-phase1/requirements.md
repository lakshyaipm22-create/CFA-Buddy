# Requirements Document

## Introduction

CFA Buddy Phase 1 establishes the foundational layer of a premium personal CFA study platform. This phase delivers the core architecture, database schema, authentication system, analytics dashboard, study/notes module, PDF viewer/resource library, and question bank. The platform is designed as a multi-user, multi-level system supporting CFA Levels I, II, and III with content from multiple providers.

## Glossary

- **Platform**: The CFA Buddy web application built with Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, and Supabase
- **User**: An authenticated individual using the Platform to study for the CFA exam
- **Auth_System**: The authentication subsystem powered by Supabase Auth responsible for sign-up, sign-in, sign-out, session management, and profile management
- **Dashboard**: The analytics home page displaying readiness metrics, progress tracking, and study statistics
- **Study_Module**: The hierarchical notes system organized by Level → Subject → Reading → Topic → Notes
- **Resource_Library**: The PDF viewer and file management system organized by Level → Subject → Resources
- **Question_Bank**: The practice question system supporting multiple test modes, filters, and performance tracking
- **Database**: The PostgreSQL database managed via Prisma ORM storing all platform entities
- **Content_Provider**: An external source of study materials (CFA Curriculum 2026, Kaplan Schweser 2026, IFT, Mark Meldrum, Fintree, Juice Notes)
- **Level**: A CFA exam level (I, II, or III)
- **Subject**: A top-level curriculum category within a Level (e.g., Ethics, Quantitative Methods, Economics)
- **Reading**: A specific reading within a Subject (e.g., "Time Value of Money")
- **Topic**: A Learning Outcome Statement (LOS) within a Reading
- **Readiness_Score**: A computed metric indicating overall exam preparedness
- **Mastery_Heatmap**: A visual representation of topic-level mastery across the curriculum
- **Mini_Quiz**: A short quiz embedded at the end of every note to reinforce learning
- **Note_Type**: A category of note content (Curriculum Notes, Schweser Notes, Coaching Notes, Personal Notes, Formula Boxes, Blue Box Examples, Exam Tips, Common Mistakes)
- **Test_Mode**: A configuration for question bank sessions (Topic Test, Subject Test, Mixed Test, Adaptive Test, Timed, Untimed, Random, Weak Topic)
- **Router**: The Next.js App Router responsible for page navigation and route protection
- **Protected_Route**: A route accessible only to authenticated Users

## Requirements

### Requirement 1: Feature-Based Project Architecture

**User Story:** As a developer, I want a feature-based folder architecture with clean separation of concerns, so that the codebase remains modular, scalable, and maintainable as new phases are added.

#### Acceptance Criteria

1. THE Platform SHALL organize source code into feature-based directories where each feature contains its own components, hooks, utilities, types, and API routes, and each feature directory name corresponds to a platform module (dashboard, study, question-bank, resource-library, flashcards, formulas, mocks).
2. THE Platform SHALL separate shared infrastructure (database clients, auth utilities, UI primitives) into a dedicated shared directory accessible by all features, and no feature-specific business logic SHALL reside in the shared directory.
3. THE Platform SHALL enforce strict TypeScript configuration with no implicit any types and strict null checks enabled.
4. THE Platform SHALL use path aliases to enable clean imports without relative path traversal beyond one level (no more than a single "../" in any import statement).
5. THE Platform SHALL co-locate tests with feature code by placing test files in a `__tests__` subdirectory within each feature directory, using a `.test.ts` or `.test.tsx` suffix matching the source file name.
6. THE Platform SHALL prohibit direct imports between feature directories; any code shared between two or more features SHALL be extracted into the shared directory.
7. THE Platform SHALL enforce no circular dependency chains between feature directories and the shared directory.

### Requirement 2: Database Schema

**User Story:** As a developer, I want a complete relational data model covering all platform entities, so that the system can store and query user data, curriculum content, progress tracking, and assessment results.

#### Acceptance Criteria

1. THE Database SHALL define a User entity storing display name, email reference, avatar URL, selected Level, created-at timestamp, and updated-at timestamp, with the authentication reference linking to the Supabase Auth user identifier.
2. THE Database SHALL define a hierarchical content structure with Level, Subject, Reading, and Topic entities linked by foreign key relationships, where each Subject belongs to one Level, each Reading belongs to one Subject, and each Topic belongs to one Reading.
3. THE Database SHALL associate each Topic with one or more Content_Provider sources through a junction entity, allowing a single Topic to reference multiple providers and a single provider to be linked to multiple Topics.
4. THE Database SHALL define a Note entity supporting multiple Note_Type values per Topic, with ownership linked to a User, where Note_Type is constrained to one of: Curriculum Notes, Schweser Notes, Coaching Notes, Personal Notes, Formula Boxes, Blue Box Examples, Exam Tips, or Common Mistakes.
5. THE Database SHALL define a Question entity associated with a Topic, a Content_Provider, a difficulty level constrained to one of (Easy, Medium, Hard), and exactly four answer choices with one marked as correct.
6. THE Database SHALL define a Question_Attempt entity recording the User's selected answer, confidence rating constrained to one of (Low, Medium, High), time spent in seconds, and a boolean correctness flag.
7. THE Database SHALL define a Flashcard entity associated with a Topic and a User, supporting spaced repetition metadata (next review date, interval in days, ease factor as a decimal value).
8. THE Database SHALL define a Formula entity associated with a Topic and optionally a Content_Provider, storing the formula content as text with support for mathematical notation markup.
9. THE Database SHALL define a Mock_Exam entity composed of ordered Question references, with metadata for total allowed time in minutes, total score as a count of correct answers, and total number of questions.
10. THE Database SHALL define a Progress entity per User per Topic tracking mastery level as an integer from 0 to 100 representing percentage mastery, questions attempted count, questions correct count, and last studied timestamp.
11. THE Database SHALL define a Study_Streak entity per User recording consecutive study days as an integer, longest streak as an integer, and current streak start date.
12. THE Database SHALL define a Bookmark entity allowing a User to bookmark any Question, Note, or Formula, using a polymorphic reference that stores the target entity type and target entity identifier.
13. THE Database SHALL define a Mistake_Log entity recording each incorrect Question_Attempt with a reference to the associated Topic for weakness analysis.
14. THE Database SHALL enforce row-level security policies ensuring a User can only access their own data for the following user-owned entities: Note (Personal Notes only), Question_Attempt, Flashcard, Progress, Study_Streak, Bookmark, and Mistake_Log.
15. THE Database SHALL support multi-level content by linking all content entities (Subject, Reading, Topic, Question, Note, Formula) to a specific Level through the hierarchical foreign key chain.
16. WHEN a new Content_Provider is added, THE Database SHALL accommodate the addition by inserting a new record into the Content_Provider entity without requiring schema changes to existing content entities.
17. IF a parent entity in the content hierarchy is deleted, THEN THE Database SHALL cascade the deletion to all dependent child entities in the hierarchy (Level → Subject → Reading → Topic) and their associated content records.
18. THE Database SHALL enforce unique constraints preventing duplicate entries for: one Progress record per User per Topic, one Study_Streak record per User, and one Bookmark per User per target entity type and target entity identifier combination.

### Requirement 3: Authentication

**User Story:** As a user, I want to create an account, sign in, and manage my session securely, so that my study data is private and persisted across sessions.

#### Acceptance Criteria

1. THE Auth_System SHALL allow a new User to sign up using a valid email address and a password that is at least 8 characters long and contains at least one uppercase letter, one lowercase letter, and one digit.
2. THE Auth_System SHALL allow an existing User to sign in using email and password.
3. THE Auth_System SHALL allow a signed-in User to sign out, invalidating the current session.
4. WHEN a User successfully authenticates, THE Auth_System SHALL create a session token and persist it for subsequent requests.
5. WHILE a User session is active, THE Auth_System SHALL refresh the session token before expiration to maintain uninterrupted access.
6. IF a request to a Protected_Route is unauthenticated, THEN THE Router SHALL redirect the request to the sign-in page.
7. IF an authenticated User requests the sign-in or sign-up page, THEN THE Router SHALL redirect the User to the Dashboard.
8. THE Auth_System SHALL provide a profile management page where a User can update their display name (between 1 and 50 characters), selected Level, and avatar (image file of type PNG, JPG, or WebP, maximum 2 MB).
9. IF a sign-in attempt fails due to invalid credentials, THEN THE Auth_System SHALL display a generic error message indicating authentication failed without revealing whether the email or password is incorrect.
10. IF a sign-up attempt uses an email already associated with an account, THEN THE Auth_System SHALL display an error indicating the email is already registered.
11. IF a sign-up attempt is submitted with an invalid email format or a password that does not meet the minimum requirements, THEN THE Auth_System SHALL display an error message indicating which field failed validation.
12. IF a profile update is submitted with a display name exceeding 50 characters or an avatar file exceeding 2 MB or not of an accepted image type, THEN THE Auth_System SHALL reject the update and display an error message indicating the validation failure.

### Requirement 4: Dashboard

**User Story:** As a user, I want to see a comprehensive analytics dashboard upon login, so that I can assess my exam readiness and identify areas needing attention.

#### Acceptance Criteria

1. WHEN a User navigates to the Dashboard and has completed at least ten questions, THE Dashboard SHALL display the Readiness_Score as a percentage (0–100%) computed from the ratio of Topics at mastery level, overall accuracy percentage, and study streak length relative to a 30-day baseline.
2. WHEN a User navigates to the Dashboard and has completed at least ten questions, THE Dashboard SHALL display an Estimated Exam Score as a percentage (0–100%) derived from question bank accuracy weighted by the CFA Institute curriculum topic weightings for the User's selected Level.
3. WHEN a User navigates to the Dashboard and has completed at least ten questions, THE Dashboard SHALL display a Probability of Passing metric as a percentage (0–100%) derived from the Readiness_Score and the User's accuracy trend over the most recent 30 days of activity.
4. THE Dashboard SHALL display the User's current study streak as the count of consecutive calendar days (in the User's local timezone) on which the User recorded at least one study action (note viewed, question answered, quiz completed, or flashcard reviewed).
5. THE Dashboard SHALL display the total number of questions solved by the User.
6. THE Dashboard SHALL display the User's overall accuracy as a percentage of correct answers out of total questions attempted.
7. THE Dashboard SHALL display the User's average time per question in seconds, computed across all Question_Attempts.
8. THE Dashboard SHALL display the User's weakest topics ranked by lowest mastery level, limited to the top five, with ties broken by fewest questions attempted.
9. THE Dashboard SHALL display the User's strongest topics ranked by highest mastery level, limited to the top five, with ties broken by most questions attempted.
10. THE Dashboard SHALL display the count of flashcards and topics with a next review date on or before the current date.
11. THE Dashboard SHALL display a daily study goal that the User may configure by selecting a target number of questions (minimum 5, maximum 200) with a progress indicator showing the percentage of the goal completed for the current calendar day.
12. THE Dashboard SHALL display weekly progress as a bar chart showing the number of questions completed per day for the past seven calendar days.
13. THE Dashboard SHALL display a Mastery_Heatmap visualizing mastery levels across all Topics within the User's selected Level.
14. THE Dashboard SHALL display a recent activity feed showing the last ten study actions (notes viewed, questions answered, quizzes completed) with timestamps.
15. WHILE the User has no recorded study data, THE Dashboard SHALL display an onboarding state with guided prompts to begin studying instead of the metrics in criteria 1–14.
16. IF the User has completed fewer than ten questions, THEN THE Dashboard SHALL display the Readiness_Score, Estimated Exam Score, and Probability of Passing as unavailable with a message indicating the minimum number of questions required.
17. IF the Dashboard fails to load study data due to a network or server error, THEN THE Dashboard SHALL display an error message indicating data could not be retrieved and provide a retry action.
18. WHEN a User navigates to the Dashboard, THE Dashboard SHALL display all metrics using data no older than the start of the current page load.

### Requirement 5: Study/Notes Module

**User Story:** As a user, I want to browse and manage study notes organized by the CFA curriculum hierarchy, so that I can study efficiently with content from multiple providers and my own annotations.

#### Acceptance Criteria

1. THE Study_Module SHALL present navigation following the hierarchy: Level → Subject → Reading → Topic → Notes.
2. WHEN a User selects a Topic, THE Study_Module SHALL display available notes organized by Note_Type tabs (Curriculum Notes, Schweser Notes, Coaching Notes, Personal Notes, Formula Boxes, Blue Box Examples, Exam Tips, Common Mistakes).
3. THE Study_Module SHALL allow a User to create, edit, and delete Personal Notes associated with any Topic, with note content limited to 50,000 characters and a maximum of 20 Personal Notes per Topic.
4. THE Study_Module SHALL render Formula Boxes with mathematical notation supporting fractions, exponents, subscripts, superscripts, Greek letters, summation and integral notation, and matrix representations.
5. THE Study_Module SHALL display Blue Box Examples with the original problem statement and worked solution.
6. WHEN a User explicitly navigates away from a Topic's notes view or selects a "Start Quiz" action, THE Study_Module SHALL present a Mini_Quiz containing three to five questions from that Topic.
7. WHEN a User completes a Mini_Quiz, THE Study_Module SHALL display the score as both the number of correct answers out of total questions and the percentage, and record the attempt in the User's progress data.
8. THE Study_Module SHALL support rich text editing for Personal Notes including headings (levels 1 through 3), ordered and unordered lists, bold, italic, code blocks, and inline formulas.
9. THE Study_Module SHALL allow a User to search across all notes by keyword with a minimum query length of 2 characters, returning up to 50 results ranked by relevance and displaying the matching Topic, Note_Type, and a text snippet containing the matched keyword.
10. THE Study_Module SHALL track and display a "last studied" timestamp for each Topic based on the User's most recent note view or Mini_Quiz completion.
11. IF a create, edit, or delete operation on a Personal Note fails, THEN THE Study_Module SHALL display an error message indicating the failure reason and preserve any unsaved content in the editor.
12. IF fewer than three questions are available for a Topic's Mini_Quiz, THEN THE Study_Module SHALL skip the Mini_Quiz and display a message indicating that insufficient questions are available for that Topic.
13. WHILE a Topic has no notes available for any Note_Type, THE Study_Module SHALL display an empty state indicating no content is available for that tab with a prompt to create a Personal Note.

### Requirement 6: PDF Viewer / Resource Library

**User Story:** As a user, I want to view and organize PDF study materials within the platform, so that I can access all my resources without switching applications.

#### Acceptance Criteria

1. THE Resource_Library SHALL organize resources hierarchically by Level → Subject → Resource category.
2. THE Resource_Library SHALL support the following resource categories: Curriculum, Schweser, IFT, Juice, Mark Meldrum, Question Banks, Formula Sheets, Videos, Personal Notes.
3. WHEN a User selects a PDF resource, THE Resource_Library SHALL render the PDF inline using a built-in viewer with page navigation, zoom (minimum 25% to maximum 400%), scroll controls, and page-at-a-time rendering to support documents up to 6000 pages without requiring the entire file to load before display.
4. THE Resource_Library SHALL allow a User to upload personal PDF files (maximum 100 MB per file, PDF format only) to the Personal Notes category within a specific Subject, rejecting files that exceed the size limit or are not valid PDF format with an error message indicating the specific rejection reason.
5. THE Resource_Library SHALL store uploaded files in Supabase Storage with access restricted to the uploading User.
6. THE Resource_Library SHALL display file metadata including file name (truncated to 80 characters with ellipsis if longer), file size, upload date, and associated Subject.
7. WHEN a User searches within the Resource_Library, THE Resource_Library SHALL filter resources by file name, Subject, and resource category, returning results within 2 seconds.
8. IF a PDF file fails to load due to a network error or corrupted file, THEN THE Resource_Library SHALL display an error message indicating the failure reason and provide a retry option that re-attempts the file load.
9. IF a file upload fails due to a network interruption or server error, THEN THE Resource_Library SHALL display an error message indicating the upload failure, preserve the User's file selection, and provide a retry option to re-attempt the upload without requiring the User to re-select the file.
10. THE Resource_Library SHALL support linking a Video resource entry to an external URL (YouTube, Vimeo) and displaying it in an embedded player.
11. IF a User provides a video URL that is not a valid YouTube or Vimeo link, THEN THE Resource_Library SHALL reject the entry and display an error message indicating that only YouTube and Vimeo URLs are supported.

### Requirement 7: Question Bank

**User Story:** As a user, I want to practice with questions in multiple test modes with advanced filtering, so that I can simulate exam conditions and target my weaknesses.

#### Acceptance Criteria

1. THE Question_Bank SHALL support the following Test_Mode options: Topic Test, Subject Test, Mixed Test, Adaptive Test, Random Questions, and Weak Topic Test.
2. WHEN a User selects a Timed test mode, THE Question_Bank SHALL enforce a countdown timer starting from the User-configured duration (minimum 5 minutes, maximum 270 minutes, default 90 minutes) and auto-submit the test upon expiration.
3. WHEN a User selects an Untimed test mode, THE Question_Bank SHALL track elapsed time without enforcing a time limit.
4. THE Question_Bank SHALL allow a User to filter questions by difficulty level (easy, medium, hard), Content_Provider, Topic, Subject, LOS, and completion status (unanswered, correct, incorrect), with multiple filters combinable simultaneously.
5. WHILE a User is in an Untimed test mode or reviewing a completed Timed test, WHEN the User answers a question, THE Question_Bank SHALL display within 1 second whether the answer is correct along with the detailed explanation.
6. WHILE a User is in a Timed test mode, THE Question_Bank SHALL withhold answer correctness and explanations until the test is submitted or the timer expires.
7. THE Question_Bank SHALL allow a User to bookmark any question for later review.
8. THE Question_Bank SHALL allow a User to assign a confidence rating (low, medium, high) to each answered question.
9. WHEN a User selects Adaptive Test mode, THE Question_Bank SHALL draw at least 70 percent of questions from Topics where the User's accuracy is below 60 percent, with the remaining questions drawn from other Topics.
10. WHEN a User selects Weak Topic Test mode, THE Question_Bank SHALL present questions exclusively from the User's five weakest Topics ranked by lowest accuracy percentage; IF fewer than five Topics have recorded attempts, THEN THE Question_Bank SHALL use all Topics with recorded attempts.
11. THE Question_Bank SHALL record each Question_Attempt with the selected answer, time spent per question in seconds, confidence rating, and correctness.
12. WHEN a User completes a test session, THE Question_Bank SHALL display a summary showing total questions, correct answers, accuracy percentage, average time per question in seconds, and performance breakdown by Topic.
13. IF a User navigates away from an incomplete test session, THEN THE Question_Bank SHALL persist the session state and allow the User to resume from the last answered question for up to 7 days.
14. THE Question_Bank SHALL allow a User to search questions by keyword (minimum 2 characters) across question text and explanation text.
15. WHEN a User configures a test session, THE Question_Bank SHALL allow the User to specify the number of questions (minimum 5, maximum 180, default 20 for Topic Test, 40 for Subject Test, and 90 for Mixed Test).

### Requirement 8: Global Search

**User Story:** As a user, I want to search across all content types from a single search interface, so that I can quickly find any note, question, formula, or resource.

#### Acceptance Criteria

1. THE Platform SHALL provide a global search accessible from every page via a keyboard shortcut (Cmd+K or Ctrl+K) and a persistent search icon.
2. WHEN a User enters a search query of at least 2 characters, THE Platform SHALL return results across notes, questions, formulas, flashcards, and resources within 500 milliseconds of the final keystroke.
3. THE Platform SHALL display search results grouped by content type, showing a maximum of 5 results per group with the matching text highlighted, and a control to reveal additional results within each group.
4. THE Platform SHALL rank search results by relevance using full-text search scoring.
5. WHEN a User selects a search result, THE Platform SHALL navigate directly to the corresponding content page.
6. IF a search query returns no matching results, THEN THE Platform SHALL display an empty-state message indicating no results were found and suggesting the User modify the query.
7. IF the search service is unavailable or the query fails to execute, THEN THE Platform SHALL display an error message indicating search is temporarily unavailable and allow the User to retry the query.

### Requirement 9: Responsive Design and Theming

**User Story:** As a user, I want the platform to be visually polished with dark mode and responsive across devices, so that I can study comfortably on any screen.

#### Acceptance Criteria

1. THE Platform SHALL use a dark color scheme as the default theme and provide a toggle allowing the User to switch between dark and light themes, persisting the selected preference across sessions.
2. THE Platform SHALL render all pages responsively, adapting layout for desktop (1024px and above), tablet (768px to 1023px), and mobile (below 768px) viewports, with all interactive elements maintaining a minimum touch target size of 44×44 CSS pixels on mobile viewports.
3. THE Platform SHALL apply animations using Framer Motion for page transitions, component mounts, and interactive feedback, with each animation duration between 150ms and 300ms.
4. THE Platform SHALL use the shadcn/ui component library for consistent, accessible UI primitives.
5. THE Platform SHALL maintain accessible contrast ratios meeting WCAG 2.1 AA standards (minimum 4.5:1 for normal text, 3:1 for large text and interactive elements) in both dark and light themes.
6. IF the User's operating system indicates a preference for reduced motion, THEN THE Platform SHALL disable or replace animations with instant state changes.
