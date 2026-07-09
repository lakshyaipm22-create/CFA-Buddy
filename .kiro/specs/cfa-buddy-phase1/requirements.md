# Requirements Document

## Introduction

CFA Buddy Phase 1 establishes the foundational layer of a personal CFA study platform. This phase delivers core architecture, database schema, authentication, analytics dashboard, learning workspace, resource library, question bank, mistake book, content scanner, question import pipeline, exam countdown, global search, and responsive design with theming. The platform uses a multi-user schema (user_id on all entities) but presents a single-user UI. The `content/` folder is the source of truth — the application adapts to it via dynamic content discovery with no hardcoded filenames.

## Glossary

- **Platform**: The CFA Buddy web application built with Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, and Supabase
- **User**: An authenticated individual using the Platform to study for the CFA exam
- **Auth_System**: The authentication subsystem powered by Supabase Auth responsible for sign-up, sign-in, sign-out, session management, and profile management
- **Dashboard**: The analytics home page displaying exam readiness metrics, progress tracking, and study statistics
- **Learning_Workspace**: The reading-level view linking Resources, Personal Notes, Questions, and Flashcards per topic, navigated via Level → Subject → Reading
- **Resource_Library**: The PDF viewer and content browser organized hierarchically with dynamic content discovery from the Content_Scanner
- **Question_Bank**: The practice question system supporting multiple test modes, confidence tracking, per-question timing, streamlined review flow, error classification, and performance analytics
- **Database**: The PostgreSQL database managed via Prisma ORM storing all platform entities
- **Content_Scanner**: The subsystem that scans the content/ folder, applies filename regex patterns, infers metadata (level, subject, reading, provider), generates the content index, and handles versioning
- **Content_Resource**: A database entity representing a discovered content file with inferred metadata (level, subject, reading, provider, file path, version, content type)
- **Question_Import_Pipeline**: The semi-automated system for extracting questions from PDF question banks into structured database records with human verification
- **Content_Provider**: An external source of study materials (CFA Curriculum 2026, Kaplan Schweser, IFT, Mark Meldrum, Fintree, UWorld, 25th Hour)
- **Level**: A CFA exam level (I, II, or III)
- **Subject**: A top-level curriculum category within a Level (e.g., Ethics, Quantitative Methods, Economics)
- **Reading**: A specific reading within a Subject (e.g., "Time Value of Money")
- **Topic**: A Learning Outcome Statement (LOS) within a Reading
- **Concept**: A Knowledge Node representing a discrete learnable idea (e.g., "Modified Duration", "LIFO vs FIFO", "Put-Call Parity"). A Concept belongs to a Topic and serves as the central linking entity connecting Questions, Notes, Formulas, Flashcards, and Mistakes. Multiple Concepts may exist within a single Topic.

- **Exam_Readiness**: A computed metric (0–100%) indicating overall exam preparedness, derived from topic mastery levels, accuracy trends, and study consistency
- **Exam_Target**: A database entity storing the User's target exam date and Level for countdown and pacing calculations
- **Confidence_Rating**: A per-question self-assessment during a test encoded in the submit button: Guess, Think So, or Certain
- **Confidence_Matrix**: A 2×3 classification grid mapping answer correctness (Correct/Incorrect) against Confidence_Rating to produce categories: Mastered (Correct + Certain), Solid (Correct + Think So), Lucky Guess (Correct + Guess), Misconception (Incorrect + Certain), Weak Area (Incorrect + Think So), Knowledge Gap (Incorrect + Guess)
- **Error_Classification**: A per-question categorization of wrong answers into: Didn't Know, Forgot Formula, Calculation Mistake, Misread Question, Careless, or Time Pressure
- **Mistake_Book**: The system that aggregates all incorrect answers with their Error_Classification, enabling targeted review and adaptive retesting
- **Review_Flow**: The 3-state post-answer experience: (1) Your Answer highlighted, (2) Reveal showing correct answer + explanation + formula, (3) Actions offering Create Flashcard, Add Note, and Classify Error
- **Test_Mode**: A configuration for question bank sessions (Topic Test, Subject Test, Mixed Test, Quick Topic Test, Adaptive Retest, Timed, Untimed, Random, Weak Topic)
- **Scratchpad**: A per-question temporary note area stored in localStorage during a test session (not persisted to the database)
- **Router**: The Next.js App Router responsible for page navigation and route protection
- **Protected_Route**: A route accessible only to authenticated Users
- **Progress**: A database entity per User per Topic tracking mastery level, questions attempted, questions correct, and last studied timestamp (denormalized for query performance, updated via triggers)
- **Study_Streak**: A database entity per User recording consecutive study days, longest streak, and current streak start date (denormalized, updated via triggers)
- **Mistake_Log**: A first-class database entity recording each incorrect attempt with classification, confidence, resolution status, and repeat count (not just a filtered view of attempts)


## Requirements

### Requirement 1: Feature-Based Project Architecture

**User Story:** As a developer, I want a feature-based folder architecture with clean separation of concerns, so that the codebase remains modular, scalable, and maintainable as new phases are added.

#### Acceptance Criteria

1. THE Platform SHALL organize source code into feature-based directories where each feature contains its own components, hooks, utilities, types, and API routes, and each feature directory name corresponds to a platform module (dashboard, learning-workspace, question-bank, resource-library, mistake-book, content-scanner, exam-countdown).
2. THE Platform SHALL separate shared infrastructure (database clients, auth utilities, UI primitives) into a dedicated shared directory accessible by all features, and no feature-specific business logic SHALL reside in the shared directory.
3. THE Platform SHALL enforce strict TypeScript configuration with no implicit any types and strict null checks enabled.
4. THE Platform SHALL use path aliases to enable clean imports without relative path traversal beyond one level (no more than a single "../" in any import statement).
5. THE Platform SHALL co-locate tests with feature code by placing test files in a `__tests__` subdirectory within each feature directory, using a `.test.ts` or `.test.tsx` suffix matching the source file name.
6. THE Platform SHALL prohibit direct imports between feature directories; any code shared between two or more features SHALL be extracted into the shared directory.
7. THE Platform SHALL enforce no circular dependency chains between feature directories and the shared directory.


### Requirement 2: Database Schema

**User Story:** As a developer, I want a complete relational data model covering all platform entities, so that the system can store and query user data, curriculum content, progress tracking, study sessions, and assessment results.

#### Acceptance Criteria

1. THE Database SHALL define a User entity storing display name, email reference, selected Level, created-at timestamp, and updated-at timestamp, with the authentication reference linking to the Supabase Auth user identifier.
2. THE Database SHALL define a hierarchical content structure with Level, Subject, Reading, and Topic entities linked by foreign key relationships, where each Subject belongs to one Level, each Reading belongs to one Subject, and each Topic belongs to one Reading.
3. THE Database SHALL define a Concept entity associated with a Topic, storing a name (maximum 100 characters), an optional description (maximum 500 characters), and a created-at timestamp. A single Topic MAY contain multiple Concepts, and each Concept SHALL serve as the central linking entity for Questions, Notes, Formulas, Flashcards, and Mistake_Log entries.
4. THE Database SHALL define a Content_Resource entity storing file path, inferred level, inferred subject, inferred reading, inferred provider, content type (PDF, video-link, formula-sheet), file size in bytes, version identifier, discovered-at timestamp, and a boolean active flag indicating whether it is the latest version.
5. THE Database SHALL define a Note entity associated with a User and attached to either a Concept or directly to a Topic (if no Concept is specified), supporting rich text content limited to 50,000 characters, with created-at and updated-at timestamps.
6. THE Database SHALL define a Question entity associated with a Concept within a Topic and a Content_Provider, storing question text, a JSONB array of answer choices (each with label, text, is_correct boolean, and explanation text) supporting variable answer counts, a difficulty level constrained to one of (Easy, Medium, Hard), and a question_source_file field recording the originating PDF filename.
7. THE Database SHALL define a Question_Attempt entity recording the User's selected answer, Confidence_Rating constrained to one of (Guess, Think So, Certain), time spent in seconds, a boolean correctness flag, a timestamp, and an optional Error_Classification constrained to one of (Didn't Know, Forgot Formula, Calculation Mistake, Misread Question, Careless, Time Pressure, Unclassified) populated only when the answer is incorrect.
8. THE Database SHALL define an Exam_Target entity per User storing target exam date, target Level, and created-at timestamp.
9. THE Database SHALL define a Progress entity per User per Topic tracking mastery level as an integer from 0 to 100, questions attempted count, questions correct count, and last studied timestamp.
10. THE Database SHALL define a Study_Streak entity per User recording consecutive study days as an integer, longest streak as an integer, and current streak start date.

11. THE Database SHALL define typed bookmark tables: Question_Bookmark (user_id, question_id), Note_Bookmark (user_id, note_id), and Resource_Bookmark (user_id, content_resource_id), each with a created-at timestamp.
12. THE Database SHALL define a Mistake_Log entity as a first-class entity recording each incorrect Question_Attempt with a reference to the associated Concept and Topic, the Error_Classification, the Confidence_Rating, a "resolved" boolean flag defaulting to false, a "repeat_count" integer defaulting to 0, and a "persistent_weakness" boolean flag defaulting to false.
13. THE Database SHALL define a Flashcard entity associated with a Concept and a User, supporting spaced repetition metadata (next review date, interval in days, ease factor as a decimal value).
14. THE Database SHALL define a Formula entity associated with a Concept and optionally a Content_Provider, storing the formula content as text with support for mathematical notation markup.
15. THE Database SHALL enforce row-level security policies ensuring a User can only access their own data for the following user-owned entities: Note, Question_Attempt, Progress, Study_Streak, all Bookmark tables, Mistake_Log, and Exam_Target.
16. THE Database SHALL support multi-level content by linking all content entities (Subject, Reading, Topic, Question, Content_Resource) to a specific Level through the hierarchical foreign key chain.
17. WHEN a new Content_Provider is added, THE Database SHALL accommodate the addition by inserting a new record into the Content_Provider entity without requiring schema changes to existing content entities.
18. IF a parent entity in the content hierarchy is deleted, THEN THE Database SHALL cascade the deletion to all dependent child entities in the hierarchy (Level → Subject → Reading → Topic) and their associated content records.
19. THE Database SHALL enforce unique constraints preventing duplicate entries for: one Progress record per User per Topic, one Study_Streak record per User, one Exam_Target per User, and one bookmark per User per target entity in each typed bookmark table.
20. THE Database SHALL store Question answer_choices as a flexible JSONB array supporting 3 choices for Level I and variable counts for Level II item sets, with each choice containing at minimum a label string, text string, is_correct boolean, and explanation string.
21. THE Database SHALL define a Page_Bookmark entity per User per Content_Resource storing the last viewed page number as an integer, enabling reading resume functionality.


### Requirement 3: Authentication

**User Story:** As a user, I want to create an account with email and password, set my display name and exam level, and manage my session securely, so that my study data is private and persisted across sessions.

#### Acceptance Criteria

1. THE Auth_System SHALL allow a new User to sign up using a valid email address, a password that is at least 8 characters long containing at least one uppercase letter, one lowercase letter, and one digit, a display name between 1 and 50 characters, and a selected Level (I, II, or III).
2. THE Auth_System SHALL allow an existing User to sign in using email and password.
3. THE Auth_System SHALL allow a signed-in User to sign out, invalidating the current session.
4. WHEN a User successfully authenticates, THE Auth_System SHALL create a session token and persist it for subsequent requests.
5. WHILE a User session is active, THE Auth_System SHALL refresh the session token before expiration to maintain uninterrupted access.
6. IF a request to a Protected_Route is unauthenticated, THEN THE Router SHALL redirect the request to the sign-in page.
7. IF an authenticated User requests the sign-in or sign-up page, THEN THE Router SHALL redirect the User to the Dashboard.
8. THE Auth_System SHALL provide a profile management page where a User can update their display name (between 1 and 50 characters) and selected Level.
9. IF a sign-in attempt fails due to invalid credentials, THEN THE Auth_System SHALL display a generic error message indicating authentication failed without revealing whether the email or password is incorrect.
10. IF a sign-up attempt uses an email already associated with an account, THEN THE Auth_System SHALL display an error indicating the email is already registered.
11. IF a sign-up attempt is submitted with an invalid email format or a password that does not meet the minimum requirements, THEN THE Auth_System SHALL display an error message indicating which field failed validation.


### Requirement 4: Dashboard

**User Story:** As a user, I want to see a comprehensive analytics dashboard upon login, so that I can assess my exam readiness and identify areas needing attention.

#### Acceptance Criteria

##### Hero Section — 7 Primary Metrics

1. WHEN a User navigates to the Dashboard and has completed at least ten questions, THE Dashboard SHALL display the Exam_Readiness metric as a percentage (0–100%) computed from the ratio of Topics at mastery level, overall accuracy percentage, and study streak length relative to a 30-day baseline.
2. THE Dashboard SHALL display the User's overall accuracy as a percentage of correct answers out of total questions attempted.
3. THE Dashboard SHALL display the User's current study streak as the count of consecutive calendar days (in the User's local timezone) on which the User recorded at least one Study_Session.
4. THE Dashboard SHALL display the count of flashcards and topics with a next review date on or before the current date, labeled "Review Due".
5. THE Dashboard SHALL display the User's weakest topics ranked by lowest mastery level, limited to the top three, with ties broken by fewest questions attempted.
6. THE Dashboard SHALL display weekly progress as a bar chart showing the number of questions completed per day for the past seven calendar days.
7. THE Dashboard SHALL display a recent activity feed showing the last five study actions (notes viewed, questions answered, reviews completed) with timestamps.

##### Advanced Analytics — Expandable Section

8. WHEN a User expands the Advanced Analytics section, THE Dashboard SHALL display an Estimated Exam Score as a percentage (0–100%) derived from question bank accuracy weighted by the CFA Institute curriculum topic weightings for the User's selected Level.
9. WHEN a User expands the Advanced Analytics section, THE Dashboard SHALL display the User's average time per question in seconds, computed across all Question_Attempts.
10. WHEN a User expands the Advanced Analytics section, THE Dashboard SHALL display the User's strongest topics ranked by highest mastery level, limited to the top five.
11. WHEN a User expands the Advanced Analytics section, THE Dashboard SHALL display total questions solved, total study sessions completed, and total study hours.
12. WHEN a User expands the Advanced Analytics section, THE Dashboard SHALL display confidence calibration as the percentage of questions marked Certain that were answered correctly.


##### Dashboard States and Error Handling

13. WHILE the User has no recorded study data, THE Dashboard SHALL display an onboarding state with guided prompts to begin studying instead of the metrics in criteria 1–12.
14. IF the User has completed fewer than ten questions, THEN THE Dashboard SHALL display the Exam_Readiness and Estimated Exam Score as unavailable with a message indicating the minimum number of questions required.
15. IF the Dashboard fails to load study data due to a network or server error, THEN THE Dashboard SHALL display an error message indicating data could not be retrieved and provide a retry action.
16. WHEN a User navigates to the Dashboard, THE Dashboard SHALL display all metrics using data no older than the start of the current page load.


### Requirement 5: Learning Workspace

**User Story:** As a user, I want a reading-level view that links all available resources, my personal notes, and related questions for each topic, so that I can study a specific reading with all materials unified in one place.

#### Acceptance Criteria

1. THE Learning_Workspace SHALL present navigation following the hierarchy: Level → Subject → Reading → Topic.
2. WHEN a User selects a Topic, THE Learning_Workspace SHALL display all available Content_Resources for the parent Reading organized by provider tabs (e.g., Curriculum, Schweser, IFT, Mark Meldrum, Fintree, Personal), and all Concepts within the selected Topic with their linked resources.
3. THE Learning_Workspace SHALL display a Personal Notes section for the selected Topic where the User can create, edit, and delete notes associated with that Topic or any Concept within it, with note content limited to 50,000 characters and a maximum of 20 notes per Topic.
4. THE Learning_Workspace SHALL support rich text editing for Personal Notes including headings (levels 1 through 3), ordered and unordered lists, bold, italic, code blocks, and inline formulas rendered with mathematical notation.
5. WHEN a User selects a provider tab, THE Learning_Workspace SHALL display the list of Content_Resources from that provider for the current Reading, each with file name, content type, and a link to open the resource in the Resource_Library viewer.
6. THE Learning_Workspace SHALL provide a "Quick Topic Test" action that launches a Question_Bank session filtered to questions from the current Topic with a default count of 10 questions in untimed mode.
7. THE Learning_Workspace SHALL track and display a "last studied" timestamp for each Topic based on the User's most recent activity referencing that Topic.
8. THE Learning_Workspace SHALL display the count of available questions and the User's accuracy percentage for the current Topic.
9. THE Learning_Workspace SHALL display a progress indicator for each Reading showing: percentage of Topics studied (based on last-studied timestamp being non-null), count of questions attempted versus total available, and count of personal notes created.
10. IF a create, edit, or delete operation on a Personal Note fails, THEN THE Learning_Workspace SHALL display an error message indicating the failure reason and preserve any unsaved content in the editor.
11. WHILE a Reading has no Content_Resources available from any provider, THE Learning_Workspace SHALL display an empty state indicating no content is available with a prompt to upload personal resources.


### Requirement 6: Resource Library

**User Story:** As a user, I want to view and organize PDF study materials within the platform with dynamic content discovery, so that I can access all my resources without switching applications.

#### Acceptance Criteria

1. THE Resource_Library SHALL organize resources hierarchically by Level → Subject → Reading → Provider, with the hierarchy populated dynamically from Content_Scanner results.
2. WHEN a User selects a PDF resource, THE Resource_Library SHALL render the PDF inline using a built-in viewer with page navigation, zoom (minimum 25% to maximum 400%), scroll controls, and page-at-a-time rendering to support documents up to 6000 pages without requiring the entire file to load before display.
3. THE Resource_Library SHALL allow a User to upload personal PDF files (maximum 100 MB per file, PDF format only) to the Personal category within a specific Subject, rejecting files that exceed the size limit or are not valid PDF format with an error message indicating the specific rejection reason.
4. THE Resource_Library SHALL store uploaded files in Supabase Storage with access restricted to the uploading User.
5. THE Resource_Library SHALL display file metadata including file name (truncated to 80 characters with ellipsis if longer), file size, content type, provider, and associated Reading.
6. THE Resource_Library SHALL support Video resources as lightweight URL links only (no embedded player), storing external URLs (YouTube, Vimeo, or other) with a title and associated Reading, opening in a new browser tab when selected.
7. IF a PDF file fails to load due to a network error or corrupted file, THEN THE Resource_Library SHALL display an error message indicating the failure reason and provide a retry option that re-attempts the file load.
8. IF a file upload fails due to a network interruption or server error, THEN THE Resource_Library SHALL display an error message indicating the upload failure, preserve the User's file selection, and provide a retry option to re-attempt the upload without requiring the User to re-select the file.
9. WHEN new files are added to the content/ folder, THE Resource_Library SHALL display the new resources after the next Content_Scanner run without requiring code changes.
10. THE Resource_Library SHALL persist the User's last viewed page number per Content_Resource in the Page_Bookmark entity, and WHEN the User reopens the same resource, THE Resource_Library SHALL resume viewing from the last saved page position.


### Requirement 7: Question Bank

**User Story:** As a user, I want to practice with questions in multiple test modes with confidence tracking, per-question timing, and a streamlined review experience, so that I can simulate exam conditions, identify misconceptions, and build deep understanding of every topic.

#### Acceptance Criteria

##### Test Modes and Configuration

1. THE Question_Bank SHALL support the following Test_Mode options: Topic Test, Subject Test, Mixed Test, Quick Topic Test, Adaptive Retest, Random Questions, and Weak Topic Test.
2. WHEN a User selects a Timed test mode, THE Question_Bank SHALL enforce a countdown timer starting from the User-configured duration (minimum 5 minutes, maximum 270 minutes, default 90 minutes) and auto-submit the test upon expiration.
3. WHEN a User selects an Untimed test mode, THE Question_Bank SHALL track elapsed time without enforcing a time limit.
4. WHEN a User configures a test session, THE Question_Bank SHALL allow the User to specify the number of questions (minimum 5, maximum 180, default 10 for Quick Topic Test, 20 for Topic Test, 40 for Subject Test, and 90 for Mixed Test).
5. WHEN a User selects Adaptive Retest mode, THE Question_Bank SHALL select questions exclusively from the User's previous incorrect answers, questions where time spent exceeded the User's average time per question by more than 50 percent, and questions where Confidence_Rating was Guess, combining all three pools and removing duplicates.
6. WHEN a User selects Weak Topic Test mode, THE Question_Bank SHALL present questions exclusively from the User's five weakest Topics ranked by lowest accuracy percentage; IF fewer than five Topics have recorded attempts, THEN THE Question_Bank SHALL use all Topics with recorded attempts.
7. WHEN a User launches a Quick Topic Test from the Learning_Workspace, THE Question_Bank SHALL create an untimed session of 10 questions filtered to the specified Reading.

##### During-Test Experience

8. THE Question_Bank SHALL display each question with its answer choices rendered from the JSONB answer_choices array, supporting variable answer counts per question.
9. THE Question_Bank SHALL present three submit buttons encoding Confidence_Rating: [Guess ▶], [Think So ▶], and [Certain ▶], where clicking any button simultaneously records the confidence selection and submits the answer in a single action.
10. THE Question_Bank SHALL track time spent per question individually in seconds, starting from when the question is displayed until the User submits via a confidence button.
11. THE Question_Bank SHALL allow a User to bookmark any question during a test for later review, with the bookmark persisting after the test session ends.
12. THE Question_Bank SHALL allow a User to flag any question for review before final submission, displaying a distinct visual indicator on flagged questions in the question navigation panel.
13. THE Question_Bank SHALL store Scratchpad content per question in localStorage for the duration of the test session, clearing it when the session ends.
14. WHILE a User is in a Timed test mode, THE Question_Bank SHALL withhold answer correctness and explanations until the test is submitted or the timer expires.
15. WHILE a User is in an Untimed test mode, WHEN the User submits an answer via a confidence button, THE Question_Bank SHALL proceed to the Review_Flow for that question within 1 second.


##### Review Flow (3-State)

16. WHEN a User reviews a completed question, THE Question_Bank SHALL present State 1: the User's selected answer highlighted with a visual indicator of correctness (correct/incorrect).
17. WHEN a User advances from State 1, THE Question_Bank SHALL present State 2 (Reveal): the correct answer highlighted, the full explanation text, and the relevant formula if applicable.
18. WHEN a User advances from State 2, THE Question_Bank SHALL present State 3 (Actions): offering three action buttons — "Create Flashcard" (creates a Flashcard with the question as front and correct answer + explanation as back), "Add Note" (opens an inline note editor attached to the question), and "Classify Error" (presents the Error_Classification prompt if the answer was incorrect).
19. THE Question_Bank SHALL allow the User to skip directly from State 1 to State 3 via a "Skip to Actions" control.

##### Confidence Matrix and Classification

20. WHEN a User completes a test session, THE Question_Bank SHALL classify each answered question into one of six Confidence_Matrix categories: Mastered (Correct + Certain), Solid (Correct + Think So), Lucky Guess (Correct + Guess), Misconception (Incorrect + Certain), Weak Area (Incorrect + Think So), or Knowledge Gap (Incorrect + Guess).
21. THE Question_Bank SHALL display the Confidence_Matrix as a visual overlay on the test results summary, showing the count and percentage of questions in each category.

##### Personal Notes on Questions

22. THE Question_Bank SHALL allow a User to attach a personal note (maximum 2000 characters) to any question, with the note persisted across sessions and accessible during subsequent reviews of that question.

##### Test Summary and Session Recording

23. THE Question_Bank SHALL record each Question_Attempt with the selected answer, time spent per question in seconds, Confidence_Rating, correctness, and timestamp.
24. WHEN a User completes a test session, THE Question_Bank SHALL display a summary showing: total questions, correct answers, accuracy percentage, average time per question in seconds, performance breakdown by Topic, Confidence_Matrix overlay, and time distribution chart (per-question times).
25. THE Question_Bank SHALL store attempt history per test session enabling attempt-over-attempt comparison (displaying accuracy progression across attempts).


##### Filtering

26. THE Question_Bank SHALL allow a User to filter questions by: difficulty level (Easy, Medium, Hard), Content_Provider, Topic, Subject, completion status (unanswered, correct, incorrect), bookmark status (bookmarked only), time performance (slow: above User's average time by more than 50 percent), confidence-correctness category (any Confidence_Matrix category), and any combination of the above filters applied simultaneously.

##### Session Persistence

27. IF a User navigates away from an incomplete test session, THEN THE Question_Bank SHALL persist the session state including all answers, Confidence_Ratings, bookmarks, flags, and per-question time spent to the database, and allow the User to resume from the last answered question for up to 7 days.

##### Analytics and Statistics

28. THE Question_Bank SHALL compute and display per-question statistics including: overall correct rate as a percentage, average time spent in seconds, and the most commonly selected wrong answer.
29. THE Question_Bank SHALL compute and display confidence calibration as the percentage of questions marked Certain that were answered correctly.
30. THE Question_Bank SHALL compute and display guess rate as the percentage of total answers where Confidence_Rating was Guess.
31. THE Question_Bank SHALL compute and display Topic-level weakness analysis ranking each Topic by accuracy percentage and average time, identifying the ten weakest Topics for the User.
32. THE Question_Bank SHALL display attempt comparison over time for any Topic or Subject, showing accuracy and confidence distribution across sequential attempts.
33. THE Question_Bank SHALL display a progress timeline showing the User's monthly accuracy trend as a line chart over the most recent 12 months of activity.

##### Error Handling

34. IF a User navigates away from an incomplete test without explicitly saving, THEN THE Question_Bank SHALL auto-save the session state within 2 seconds of navigation.
35. IF the Question_Bank fails to load questions due to a network or server error, THEN THE Question_Bank SHALL display an error message indicating that questions could not be retrieved and provide a retry action.


### Requirement 8: Global Search

**User Story:** As a user, I want to search across all content types from a single search interface accessible anywhere in the app, so that I can quickly find any note, question, resource, or topic.

#### Acceptance Criteria

1. THE Platform SHALL provide a global search accessible from every page via a keyboard shortcut (Cmd+K on macOS, Ctrl+K on Windows/Linux) and a persistent search icon in the navigation bar.
2. WHEN a User enters a search query of at least 2 characters, THE Platform SHALL return results across notes, questions, content resources, topics, and readings within 500 milliseconds of the final keystroke.
3. THE Platform SHALL display search results grouped by content type (Notes, Questions, Resources, Topics), showing a maximum of 5 results per group with the matching text highlighted, and a control to reveal additional results within each group.
4. THE Platform SHALL rank search results by relevance using full-text search scoring.
5. WHEN a User selects a search result, THE Platform SHALL navigate directly to the corresponding content page (Learning_Workspace for topics, Resource_Library for resources, Question_Bank for questions).
6. IF a search query returns no matching results, THEN THE Platform SHALL display an empty-state message indicating no results were found and suggesting the User modify the query.
7. IF the search service is unavailable or the query fails to execute, THEN THE Platform SHALL display an error message indicating search is temporarily unavailable and allow the User to retry the query.


### Requirement 9: Responsive Design, Theming, and Keyboard Navigation

**User Story:** As a user, I want the platform to be visually polished with dark mode, responsive across devices, and navigable via keyboard shortcuts, so that I can study comfortably and efficiently on any screen.

#### Acceptance Criteria

1. THE Platform SHALL use a dark color scheme as the default theme and provide a toggle allowing the User to switch between dark and light themes, persisting the selected preference across sessions.
2. THE Platform SHALL render all pages responsively, adapting layout for desktop (1024px and above), tablet (768px to 1023px), and mobile (below 768px) viewports, with all interactive elements maintaining a minimum touch target size of 44×44 CSS pixels on mobile viewports.
3. THE Platform SHALL apply animations using Framer Motion for page transitions, component mounts, and interactive feedback, with each animation duration between 150ms and 300ms.
4. THE Platform SHALL use the shadcn/ui component library for consistent, accessible UI primitives.
5. THE Platform SHALL maintain accessible contrast ratios meeting WCAG 2.1 AA standards (minimum 4.5:1 for normal text, 3:1 for large text and interactive elements) in both dark and light themes.
6. IF the User's operating system indicates a preference for reduced motion, THEN THE Platform SHALL disable or replace animations with instant state changes.
7. THE Platform SHALL support keyboard navigation shortcuts: j/k for navigating list items up/down, / (forward slash) to focus the global search input, b to toggle bookmark on the current item, n to open a new note editor, Enter to open the selected item, and Esc to close modals or navigate back.
8. WHEN a keyboard shortcut is pressed while a text input or textarea is focused, THE Platform SHALL suppress the shortcut action and allow normal text input.
9. THE Platform SHALL display a keyboard shortcut reference accessible via a "?" key press, showing all available shortcuts in a dismissible modal overlay.


### Requirement 10: Mistake Book and Error Classification

**User Story:** As a user, I want every incorrect answer automatically logged with a classification of why I got it wrong, so that I can identify patterns in my mistakes and eliminate them through targeted review.

#### Acceptance Criteria

##### Error Classification on Wrong Answers

1. WHEN a User answers a question incorrectly and reaches Review_Flow State 3 (Actions), THE Mistake_Book SHALL present the Error_Classification prompt with the following options: Didn't Know, Forgot Formula, Calculation Mistake, Misread Question, Careless, or Time Pressure.
2. THE Mistake_Book SHALL allow the User to skip the Error_Classification prompt, in which case the attempt SHALL be recorded with an "Unclassified" label.
3. THE Mistake_Book SHALL allow the User to update the Error_Classification for any previously classified incorrect attempt.

##### Mistake Log and Review

4. THE Mistake_Book SHALL maintain a chronological log of all incorrect Question_Attempts with: the question reference, the User's selected answer, the correct answer, the Error_Classification, the Confidence_Rating, the time spent, the associated Topic, and the timestamp.
5. THE Mistake_Book SHALL allow a User to filter the mistake log by: Error_Classification category, Subject, Topic, Content_Provider, date range, and Confidence_Matrix category (Misconception, Weak Area, Knowledge Gap).
6. THE Mistake_Book SHALL display a summary card for each mistake showing the question text preview (first 100 characters), the Error_Classification badge, the Confidence_Rating badge, the time spent, and the Topic name.
7. WHEN a User selects a mistake entry, THE Mistake_Book SHALL present the full Review_Flow for that question starting from State 1 (User's answer highlighted).

##### Error Pattern Analytics

8. THE Mistake_Book SHALL compute and display an error type breakdown showing the percentage of incorrect answers in each Error_Classification category, presented as a donut chart.
9. THE Mistake_Book SHALL compute and display error trends over time showing weekly counts per Error_Classification category as a stacked bar chart for the most recent 12 weeks.
10. THE Mistake_Book SHALL identify and highlight the User's dominant error pattern (the Error_Classification category with the highest count over the most recent 30 days) and display a targeted recommendation for addressing that error type.
11. THE Mistake_Book SHALL compute and display the ratio of Misconceptions (Incorrect + Certain) to total incorrect answers as a standalone metric, flagging it as critical when it exceeds 25 percent.


##### Targeted Retest from Mistakes

12. THE Mistake_Book SHALL allow a User to generate a retest session composed exclusively of questions from the mistake log, configurable by Error_Classification filter and limited to a User-specified count (minimum 5, maximum 100).
13. WHEN a User correctly answers a question during a mistake retest, THE Mistake_Book SHALL mark the mistake entry as "Resolved" while retaining the original mistake record for historical analytics.
14. WHEN a User incorrectly answers the same question in a subsequent attempt, THE Mistake_Book SHALL increment the "repeat_count" on that question's mistake entry and flag it as a persistent weakness when the counter reaches 3.

##### Integration with Question Bank

15. THE Mistake_Book SHALL automatically create a mistake entry for every incorrect Question_Attempt recorded by the Question_Bank, regardless of test mode.
16. THE Mistake_Book SHALL expose mistake data to the Dashboard for display in the weakness analysis components.

##### Error Handling

17. IF the Mistake_Book fails to record an error classification due to a network or server error, THEN THE Mistake_Book SHALL queue the classification locally and retry submission when connectivity is restored, displaying a status indicator to the User.


### Requirement 11: Content Scanner and Indexer

**User Story:** As a developer, I want an automated content scanner that discovers files in the content/ folder, infers metadata from filename patterns and folder structure, and generates a searchable index, so that the application adapts to new content without code changes.

#### Acceptance Criteria

1. THE Content_Scanner SHALL recursively scan the content/ folder and discover all PDF files, recording their absolute file paths, sizes, and modification timestamps.
2. THE Content_Scanner SHALL apply configurable filename regex patterns to infer metadata from each discovered file: level, subject, reading, provider, and content type (notes, question-bank, mock, formula-sheet).
3. THE Content_Scanner SHALL infer the provider from folder path segments matching known provider names (curriculum, schweser, ift, fintree, mark-meldrum, uworld, 25th-hour, personal).
4. THE Content_Scanner SHALL infer the subject from filename abbreviations and folder names using a configurable subject mapping (e.g., FSA → Financial Statement Analysis, QM → Quantitative Methods, Eco → Economics).
5. THE Content_Scanner SHALL generate a content-index.json metadata file in the content/metadata/ directory containing an array of Content_Resource records with all inferred metadata.
6. THE Content_Scanner SHALL support incremental scanning: on subsequent runs, only files with modification timestamps newer than the last scan timestamp or files not present in the existing index SHALL be processed.
7. THE Content_Scanner SHALL handle version detection by comparing year identifiers in filenames (e.g., "2024" vs "2025") and marking the most recent version as active by default while retaining older versions as inactive.
8. WHEN a file in the content/ folder does not match any configured filename pattern, THE Content_Scanner SHALL create a Content_Resource entry with content type "unknown" and null values for unresolved metadata fields, allowing manual classification later.
9. THE Content_Scanner SHALL detect paired question/answer files by matching filenames that differ only by an " - Answers" suffix and link them as a question-answer pair in the index.
10. IF the content/ folder is empty or inaccessible, THEN THE Content_Scanner SHALL log a warning and produce an empty index without failing.
11. THE Content_Scanner SHALL be executable as a CLI command and as an API route callable from the application admin interface.
12. WHEN new files are added to the content/ folder, THE Content_Scanner SHALL discover and index them on the next scan run without requiring any application code modifications.
13. THE Content_Scanner SHALL expose an Import Status view displaying: total files discovered per content type (curriculum, schweser, notes, question-banks, mocks, formulas), percentage of files with fully resolved metadata versus partially resolved or unknown, count of questions imported versus estimated total from question bank files, and a per-provider completion indicator.


### Requirement 12: Question Import Pipeline

**User Story:** As a user, I want a semi-automated pipeline to extract questions from PDF question banks into structured database records, so that I can practice with questions in the Question Bank without manual data entry.

#### Acceptance Criteria

1. THE Question_Import_Pipeline SHALL accept a source PDF file path (or paired question PDF + answer PDF paths) and a target Content_Provider identifier as input.
2. THE Question_Import_Pipeline SHALL extract question text, answer choices, and correct answer identifiers from the source PDF using text extraction, producing structured candidate records.
3. THE Question_Import_Pipeline SHALL associate each extracted question with the source file by storing the question_source_file field referencing the originating PDF filename.
4. THE Question_Import_Pipeline SHALL attempt to infer the associated Subject and Reading from the source file's metadata in the content index or from the filename pattern.
5. THE Question_Import_Pipeline SHALL support batch import of multiple questions from a single source file, recording the total count of extracted candidates and the count of successfully imported records.
6. THE Question_Import_Pipeline SHALL present extracted candidates in a verification interface where the User can review, edit, approve, or reject each question before it is committed to the database.
7. THE Question_Import_Pipeline SHALL store each imported question with a provenance record linking it to the source file, extraction timestamp, and verification status (pending, approved, rejected).
8. THE Question_Import_Pipeline SHALL handle paired question/answer files by matching questions from the question file with explanations and correct answers from the corresponding answer file, using reading number and question number as correlation keys.
9. IF text extraction fails for a source PDF due to image-based content or encryption, THEN THE Question_Import_Pipeline SHALL report the failure with a descriptive error message and skip that file without affecting other files in a batch.
10. IF a duplicate question is detected (matching question text and Content_Provider already exists in the database), THEN THE Question_Import_Pipeline SHALL flag the candidate as a duplicate and skip import unless the User explicitly approves an override.


### Requirement 13: Exam Countdown and Study Plan

**User Story:** As a user, I want to set my target exam date and see a countdown with pacing indicators, so that I can plan my study schedule and know whether my current pace is sufficient.

#### Acceptance Criteria

1. THE Platform SHALL allow a User to set a target exam date and target Level through the Exam_Target entity, with the date constrained to be in the future at the time of creation.
2. WHEN a User has set an Exam_Target, THE Platform SHALL display a countdown showing the number of days remaining until the exam date, visible on the Dashboard.
3. THE Platform SHALL compute and display the number of Topics remaining to be studied (mastery level below 50%) divided by the days remaining, presented as "Topics per day needed" to stay on track.
4. THE Platform SHALL compute and display a daily study target as the number of questions per day needed to cover all Topics at least once before the exam date, based on remaining unanswered questions and days available.
5. THE Platform SHALL compute and display a weekly study target as the daily target multiplied by 7, shown alongside weekly progress from the Dashboard.
6. THE Platform SHALL display a pacing indicator (ahead, on track, or behind) by comparing the User's actual weekly progress against the computed weekly target, where "ahead" is greater than 110% of target, "on track" is between 90% and 110%, and "behind" is below 90%.
7. WHEN the exam date is within 30 days, THE Platform SHALL highlight the countdown display with an urgent visual indicator and increase the visibility of the pacing status.
8. IF the User has not set an Exam_Target, THEN THE Platform SHALL display a prompt to set an exam date in the Dashboard's exam countdown area, and all pacing-related metrics SHALL be hidden.
