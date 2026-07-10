# CFA Buddy -- Project Handover Report (July 10, 2026)

## IDENTITY
- **Repo:** `lakshyaipm22-create/CFA-Buddy`
- **Owner's Machine:** Windows 11, PowerShell, Node.js, VS Code
- **Framework:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4
- **Database:** Supabase (PostgreSQL 17), Prisma 7.8.0
- **Hosting:** Vercel (not yet deployed to production)

## GIT BRANCHES (all on GitHub)
| Branch | Status | Description |
|--------|--------|-------------|
| `main` | Behind | Only has initial commit. NOT up to date. |
| `feat/phase1-implementation` | Pushed | Core app: 50 sample questions, all pages |
| `feat/phase2-features` | Pushed | Flashcards, Formulas, Study Timer, LOS Tracker |
| `feat/phase3-ai-polish` | Pushed | Revision Planner, Insights, PWA, Notifications |
| `feat/phase4-production` | Pushed | Settings, Landing page, Error boundaries |
| `feat/real-questions` | **LATEST** | Real PDF import (1,038 questions) + instant feedback UI |

**To get latest:** `git fetch origin feat/real-questions && git checkout feat/real-questions`

## ENVIRONMENT VARIABLES (all set in Kiro sandbox and user's .env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://zgnygrbpmfnfwlraxjxe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set>
SUPABASE_SERVICE_ROLE_KEY=<set>
DATABASE_URL=postgresql://postgres.zgnygrbpmfnfwlraxjxe:<pw>@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres.zgnygrbpmfnfwlraxjxe:<pw>@aws-0-ap-northeast-2.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
CONTENT_BASE_PATH=./content
```

## SUPABASE PROJECT
- **Project ID:** `zgnygrbpmfnfwlraxjxe`
- **Region:** ap-northeast-2
- **Database:** PostgreSQL 17, 22 tables deployed, RLS enabled on ALL tables
- **Schema deployed via:** Supabase MCP `apply_migration` tool (not Prisma migrate)
- **Seed data:** 3 levels, 10 CFA L1 subjects with weights, 8 content providers
- **Tables:** users, levels, subjects, readings, topics, concepts, content_providers, content_resources, questions, question_sessions, question_attempts, notes, formulas, flashcards, progress, study_streaks, exam_targets, mistake_logs, question_bookmarks, note_bookmarks, resource_bookmarks, page_bookmarks

## KIRO POWERS AVAILABLE
1. **Supabase** (`supabase-hosted`) -- For DB queries, migrations, RLS
2. **Context7** -- For Next.js/React/Prisma/Framer Motion API docs
3. **Tavily** -- For web search when hitting errors
4. **GitHub** -- For push_to_remote, create PR, list PRs

## STEERING FILES
- **Global:** `CFA Buddy Development Rules.md` (loaded automatically in every session)
- **Repo:** `.kiro/steering/content-repository.md` -- Content folder rules

## CRITICAL REACT RULES (NEVER VIOLATE)
1. **NEVER** use `useSyncExternalStore` for one-time localStorage reads. Use `useState(() => ...)` lazy initializer.
2. **NEVER** call `router.push()` during render phase. Only in `useEffect` or event handlers.
3. **NEVER** return `JSON.parse()` from a `getSnapshot` function. Cache at module level.
4. `createServerSupabaseClient()` returns **null** when Supabase not configured. Always check.
5. Always delete `.next` folder after pulling new code.

## APP ARCHITECTURE
- **178 TypeScript/TSX source files**
- **29 compiled routes**
- **Data Layer:** ALL user data in localStorage (offline-first). DB schema ready but not wired to app.
- **Content:** 617 PDFs in `./content/` folder (gitignored). Scanned by `npm run scan:content`.
- **Questions:** 50 sample questions in code + 1,038 imported from PDFs (in JSON files on disk)
- **Theme:** Dark/Light toggle via CSS variables in `globals.css`
- **Colors:** Navy #002B5C, Gold #C5A258, Green #00843D, Background #0a0e14

## PAGES (29 routes)
| Page | Path | Description |
|------|------|-------------|
| Landing | `/` | Hero page for unauthenticated users |
| Dashboard | `/dashboard` | Metrics, exam countdown, study plan, charts |
| Learn | `/learn` | Subject -> Reading -> Topic navigation |
| Resources | `/resources` | PDF browser with viewer |
| Questions | `/questions` | Session configurator + analytics |
| Question Session | `/questions/session/[id]` | Active test with instant feedback |
| Session Review | `/questions/review/[id]` | Results + flashcard creation |
| Flashcards | `/flashcards` | SM-2 spaced repetition deck |
| Formulas | `/formulas` | 30 CFA formulas, searchable, bookmarkable |
| Revision | `/revision` | Spaced revision planner per subject |
| Insights | `/insights` | Predicted score, time analysis, charts |
| LOS Tracker | `/los-tracker` | GitHub-style progress grid |
| Mistakes | `/mistakes` | Error analysis + donut/bar charts |
| Exam Plan | `/exam-plan` | Countdown + pacing + daily targets |
| Settings | `/profile` | Theme, Export/Import/Reset data, About |
| Admin Scanner | `/admin/scanner` | Trigger content scan |
| Admin Import | `/admin/import` | Question import UI |

## KEY FEATURES IMPLEMENTED
- Question Bank with 7 test modes, confidence tracking, per-question timer
- Instant answer feedback (CFA Institute style): green/red highlighting immediately after answering
- Flashcards with SM-2 algorithm (ease factor, interval, repetitions)
- Formula Center with 30 seeded formulas
- AI Study Recommendations (rule-based, no API needed)
- Study Timer widget (persistent, tracks by page)
- Toast notification system
- Keyboard shortcuts (j/k navigation, ?, Cmd+K search)
- PWA manifest + service worker
- Mobile responsive sidebar (hamburger menu)
- Data export/import/reset in Settings

## KNOWN BUGS / INCOMPLETE ITEMS

### BUG 1: Imported questions not loaded into app (HIGH PRIORITY)
- **Status:** 1,038 questions imported to `content/metadata/imported-questions/*.json`
- **Problem:** `question-loader.ts` reads from localStorage (`cfa-buddy-imported-questions` key), but the JSON files are on disk. The browser can't read filesystem.
- **Fix needed:** Either:
  - (a) Create an API route that serves the JSON files, and auto-load on app startup
  - (b) Add a build-time step that bundles imported questions into the app
  - (c) Add a "Load Questions" button in admin that reads the JSON files via API and stores in localStorage

### BUG 2: Answer matching failed for 3 subjects
- Fixed Income: 132 questions, 0 with correct answers
- Alternative Investments: 65 questions, 0 with correct answers
- Derivatives: 45 questions, only 10 with correct answers
- **Root cause:** The solution parser expects `"N. X is correct."` format. These PDFs likely use a different format (e.g., just `"N. X"` or `"N. X. explanation"` without "is correct").
- **Fix:** Improve `parseAnswers()` in `question-parser.ts` to handle more formats.

### BUG 3: The user's working local import script differs from sandbox
- User's local version uses: `createRequire(import.meta.url)` + `new PDFParse()` class (pdf-parse v2)
- Sandbox version uses: `await import('pdf-parse')` with `.default` fallback
- **Both work.** The user's version is the one that actually imported 1,038 questions.

### NOT YET DONE:
- `main` branch is behind -- needs merge from feature branches
- Vercel deployment not live yet
- Supabase DB not connected to app (localStorage is the data layer)
- No real authentication flow tested end-to-end

## IMPORT RESULTS (from user's local machine)
| Subject | Questions | With Answers |
|---------|-----------|-------------|
| Quantitative Methods | 109 | 106 |
| Economics | 70 | 70 |
| Corporate Issuers | 23 | 23 |
| Financial Statement Analysis | 208 | 207 |
| Equity Investments | 180 | 178 |
| Fixed Income | 132 | 0 |
| Derivatives | 45 | 10 |
| Alternative Investments | 65 | 0 |
| Portfolio Management | 139 | 138 |
| Ethics | 67 | 43 |
| **TOTAL** | **1,038** | **775** |

## COMMANDS CHEAT SHEET (Windows PowerShell)
```powershell
# Setup (one time after pulling)
git fetch origin feat/real-questions
git checkout feat/real-questions
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
npm install
npx prisma generate
npm run dev

# Verification
npx tsc --noEmit
npm run lint
npm run build
npm run test

# Content scanner
npm run scan:content

# Question import (single file)
npm run import:questions -- --file="content\question-banks\level1\2025 Curriculm End of Chapter Qts\4. Financial Statement Analysis.pdf" --subject="Financial Statement Analysis" --provider="curriculum"

# Git push (from Kiro sandbox -- NEVER use git push bash)
# Use GitHub power tool: push_to_remote with path="/projects/sandbox/CFA-Buddy"
```

## LOCALSTORAGE KEYS USED
| Key | Content |
|-----|---------|
| `cfa-buddy-sessions` | Array of QuestionSession objects |
| `cfa-buddy-exam-date` | Target exam date string |
| `cfa-buddy-theme` | "dark" or "light" |
| `cfa-buddy-flashcards` | Array of Flashcard objects |
| `cfa-buddy-flashcards-reviewed-today` | `{date, count}` |
| `cfa-buddy-formula-bookmarks` | Array of formula IDs |
| `cfa-buddy-los-progress` | Map of LOS ID -> status |
| `cfa-buddy-revision-schedule` | Map of subject -> `{stage, lastRevised}` |
| `cfa-buddy-study-timer` | Array of timer sessions |
| `cfa-buddy-recent-searches` | Last 5 search queries |
| `cfa-buddy-imported-questions` | Array of imported Question objects (WHERE REAL QUESTIONS SHOULD GO) |

## KEY TYPE DEFINITIONS
```typescript
type Confidence = 'Guess' | 'ThinkSo' | 'Certain';
type TestMode = 'Topic' | 'Subject' | 'Mixed' | 'QuickTopic' | 'AdaptiveRetest' | 'Random' | 'WeakTopic';
type CardState = 'new' | 'learning' | 'review' | 'mastered';
type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

interface Question {
  id: string;
  questionText: string;
  answerChoices: AnswerChoice[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  reading: string | null;
  topic: string | null;
  provider: string;
  questionSourceFile: string | null;
}

interface AnswerChoice {
  label: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}
```

## FOR THE NEW SESSION -- IMMEDIATE PRIORITIES:
1. **Fix Bug 1:** Make the 1,038 imported questions load into the Question Bank. Best approach: Create `/api/imported-questions` route that reads JSON files from disk and returns them. Add a client-side loader that fetches on first visit and stores in localStorage.
2. **Fix Bug 2:** Improve answer parser for Fixed Income / Alt Investments / Derivatives PDFs.
3. **Merge to main:** Squash merge feat/real-questions -> main and push.
4. **Deploy to Vercel:** Connect repo, set env vars, deploy.

## INSTRUCTION FOR NEW SESSION:
Store this document as a `.kiro/steering/project-state.md` file in the repository so every future Kiro session automatically has access to it. Update it whenever a bug is fixed or a major change is made. This becomes the living knowledge base.
