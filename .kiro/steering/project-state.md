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
- **Questions:** 50 sample questions in code + 1,000 questions available via /api/imported-questions (reads from content/metadata/imported-questions/*.json)
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
- CFA Mock Exam mode (90 questions, 135 min, curriculum-weighted)
- Subject multi-select filter in configurator
- AdaptiveRetest mode (retests previously wrong answers)
- WeakTopic mode (targets subjects with <60% accuracy)
- Live per-question timer + session countdown
- Question navigation grid with color coding
- Keyboard shortcuts during tests
- Enhanced review dashboard with subject breakdown, time traps, session history
- Admin question refresh button
- Auto session cleanup (30-day expiry, 50 max)
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
- **Status:** FIXED - Imported questions now served via /api/imported-questions API route and auto-loaded into localStorage on first visit.
- The useImportedQuestions hook fetches from the API route on first visit (or when stale after 24 hours) and caches in localStorage.
- Admin can manually reload via the "Reload Questions from Server" button on the /admin/import page.

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

---

# CFA Buddy -- Advanced Follow-Up (Technical Debt + Next Steps)

## TECHNICAL DEBT INVENTORY

### Critical (Fix Before Production)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Imported questions not in app** | `question-loader.ts` reads localStorage only | 1,038 questions invisible to users |
| 2 | **0 Suspense boundaries** | Entire app | No streaming, poor loading UX on slow connections |
| 3 | **Only 1 error.tsx** | `(protected)/error.tsx` exists, `(auth)/error.tsx` missing on GitHub | Unhandled errors show white screen |
| 4 | **pdf-parse is 78MB** | `node_modules/pdf-parse` | Bloats deployment, should be devDependency only |
| 5 | **42/82 components are client** | 51% client-side | Too much JS shipped, reduce where possible |

### High Priority (Before Public Beta)

| # | Issue | Fix |
|---|-------|-----|
| 6 | **Recharts not lazy-loaded** in dashboard | Only `insights-content.tsx` uses dynamic import. Dashboard imports directly. Wrap in `dynamic(() => import(...), { ssr: false })` |
| 7 | **No page metadata** on 10+ pages | Missing `<title>` for SEO/tabs. Add `export const metadata = {...}` to each |
| 8 | **Hardcoded colors in import-dashboard.tsx** | 5 instances of `bg-[#0d1117]`, `border-[#1a2332]` -- breaks light theme |
| 9 | **Test coverage: 2 test files** out of 19 features | Only content-scanner has tests. Zero tests for flashcards, formulas, SM-2 algorithm, question-parser |
| 10 | **No ARIA attributes** on interactive components | Keyboard-navigable lists lack `role="listbox"`, `aria-selected`, etc. |

### Low Priority (Polish)

| # | Issue | Notes |
|---|-------|-------|
| 11 | Memory leak patterns: 5 `addEventListener` without cleanup shown | Most likely fine (cleanup IS in returns) but audit needed |
| 12 | `main` branch out of date | Only has 1 commit. All work on feature branches. |
| 13 | No CI/CD pipeline | No GitHub Actions. Manual verification only. |
| 14 | Framer Motion (5.7MB) imported but barely used | Only imported in package.json, not actually animating much. Either use it or remove it. |

---

## PERFORMANCE OPTIMIZATION ROADMAP

```
Current State:
- First Load JS: ~250KB (estimated from recharts + react-pdf)
- pdf-parse: should be devDependency only (78MB, CLI tool only)
- No code-splitting beyond 6 dynamic imports in insights page

Target State:
- First Load JS: <150KB
- pdf-parse: removed from production bundle
- All charts lazy-loaded
- Heavy features (PDF viewer, Recharts) behind dynamic import
```

### Actions:
1. Move `pdf-parse` to `devDependencies` in package.json (it's only used in CLI scripts)
2. Lazy-load `recharts` in ALL components (dashboard, analytics, mistake-book, exam-plan)
3. Lazy-load `react-pdf` (already client-only but verify bundle splitting)
4. Add `next/dynamic` with `{ ssr: false }` for all chart components
5. Remove `framer-motion` if not actually animating, or implement page transitions

---

## QUESTION LOADING ARCHITECTURE (How to Fix Bug #1)

The correct architecture for serving imported questions:

```
Option A (Recommended -- API Route):
1. Create /api/imported-questions/route.ts
2. It reads all *.json from content/metadata/imported-questions/
3. Merges them into one array
4. Returns JSON response
5. On client: fetch once on app load -> store in localStorage
6. Subsequent loads: read from localStorage (cached)

Option B (Build-time -- for Vercel):
1. At build time (next.config.ts), read the JSON files
2. Bundle them into a static data file (like sample-questions.ts)
3. Import directly -- no API needed
4. Problem: won't update without rebuild

Option C (Admin UI):
1. Add "Load Questions" button on /admin/import page
2. Reads the API endpoint from Option A
3. Stores in localStorage
4. Shows confirmation: "1,038 questions loaded"
```

**Recommended: Option A + C combined.** API route for data, admin button for manual refresh.

---

## ANSWER PARSER FIX STRATEGY (Bug #2)

The 3 failing subjects likely use one of these alternate formats:

```
Format 1 (current -- works):
  "1. C is correct. Explanation text..."

Format 2 (likely Fixed Income):
  "1. C Explanation text..."  (no "is correct")

Format 3 (likely Derivatives):
  "1. C. Explanation text..."  (letter followed by period)

Format 4 (may exist):
  "1. C\nExplanation text..."  (letter on separate line from explanation)
```

**Fix:** Update `parseAnswers()` regex to handle all formats:
```typescript
// Current (only matches "X is correct"):
/^([A-D])\s+(?:is\s+)?correct/i

// Fixed (matches X with or without "is correct"):
/^([A-D])(?:\s+is\s+correct|\.|)\s*[.]?\s*([\s\S]*?)$/i
```

---

## TESTING STRATEGY (What to Test)

Priority order for adding tests:

1. **SM-2 Algorithm** (`src/features/flashcards/utils/sm2.ts`) -- mathematical correctness
   - Property: ease factor never drops below 1.3
   - Property: interval increases on quality >= 3
   - Property: repetitions reset on quality < 3
   
2. **Question Parser** (`src/features/question-bank/utils/question-parser.ts`) -- parsing correctness
   - Test against sample PDF text from each format
   - Verify question count matches expected
   - Verify answer matching by number

3. **Question Selector** (`src/features/question-bank/utils/question-selector.ts`) -- filter logic
   - Property: returned questions match filter criteria
   - Property: count never exceeds requested
   - Property: no duplicates in result set

4. **Confidence Matrix** (`src/features/question-bank/utils/confidence-matrix.ts`)
   - Property: all 6 cells sum to total attempts
   - Property: each cell has correct classification

---

## DEPLOYMENT CHECKLIST

```
[ ] Move pdf-parse to devDependencies
[ ] Verify build passes without content/ folder (Vercel)
[ ] Set env vars in Vercel dashboard
[ ] Merge feat/real-questions -> main
[ ] Push main
[ ] Connect to Vercel
[ ] Verify: landing page loads
[ ] Verify: /dashboard loads (localStorage empty = onboarding state)
[ ] Verify: /questions loads with 50 sample questions (no imported)
[ ] Test: sign up -> sign in -> auth flow
[ ] Performance: check First Load JS in build output
```

---

## FILE STRUCTURE (Key Directories)

```
src/
├── app/                          # 29 routes (Next.js App Router)
│   ├── (auth)/                   # Sign in/up/reset (no sidebar)
│   ├── (protected)/              # Main app (sidebar + header)
│   │   ├── dashboard/
│   │   ├── questions/session/[sessionId]/
│   │   ├── questions/review/[sessionId]/
│   │   ├── flashcards/
│   │   ├── formulas/
│   │   ├── revision/
│   │   ├── insights/
│   │   ├── los-tracker/
│   │   ├── exam-plan/
│   │   └── ...
│   └── api/                      # 3 API routes (content, scanner, search)
├── features/                     # 19 feature modules
│   ├── question-bank/            # Types, components, utils, data
│   ├── flashcards/               # SM-2 algorithm, storage, UI
│   ├── formulas/                 # Seed data, center component
│   ├── content-scanner/          # 8 parsers, scan logic
│   ├── dashboard/                # Metrics, charts, hooks
│   ├── exam-plan/
│   ├── insights/
│   ├── los-tracker/
│   ├── mistake-book/
│   ├── notifications/
│   ├── revision/
│   ├── search/
│   ├── settings/
│   ├── study-plan/
│   └── study-timer/
├── shared/                       # Cross-feature code
│   ├── components/layout/        # Sidebar, Header, ThemeProvider
│   ├── components/feedback/      # Toast, ErrorBoundary, EmptyState
│   ├── hooks/                    # useKeyboardShortcuts, useListNavigation
│   ├── lib/supabase/             # Client, Server, Middleware
│   ├── lib/prisma/               # Prisma client singleton
│   └── config/navigation.ts      # 11 nav items
├── scripts/                      # CLI tools (scan-content, import-questions)
└── generated/prisma/             # Prisma client output
```

---

## WHAT THE NEW SESSION SHOULD DO FIRST

```
1. Save this entire document as .kiro/steering/project-state.md
2. Read it at the start of every task
3. After fixing any bug -> update the relevant section
4. After adding any feature -> update the pages/features table
5. Keep the KNOWN BUGS section current (remove fixed, add new)
```

---

*End of handover. This document is the single source of truth for CFA Buddy development state.*
