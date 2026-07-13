# CFA Buddy — Project State (Updated July 10, 2026)

## IDENTITY
- **Repo:** `lakshyaipm22-create/CFA-Buddy` (PUBLIC)
- **Owner's Machine:** Windows 11, PowerShell, Node.js, VS Code
- **Framework:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4
- **Database:** Supabase (PostgreSQL 17), Prisma 7.8.0
- **Hosting:** Vercel — **LIVE at https://cfa-buddy.vercel.app**
- **Supabase Project ID:** `zgnygrbpmfnfwlraxjxe` (ap-northeast-2)

## DEPLOYMENT STATUS: ✅ LIVE
- **URL:** https://cfa-buddy.vercel.app
- **Branch deployed:** `main`
- **Vercel team:** CFA_Buddy (Hobby plan)
- **Auto-deploys:** On push to `main`
- **Note:** Vercel Hobby blocks commits from non-owner authors (kiro-agent). Always make a commit yourself after pulling Kiro changes before pushing to main.

## GIT BRANCHES
| Branch | Status | Description |
|--------|--------|-------------|
| `main` | **PRODUCTION** | Full app deployed to Vercel |
| `feat/real-questions` | **LATEST DEV** | Most up-to-date code (merged into main) |
| `feat/phase1-implementation` | Archived | Core app |
| `feat/phase2-features` | Archived | Flashcards, Formulas |
| `feat/phase3-ai-polish` | Archived | Revision, Insights, PWA |
| `feat/phase4-production` | Archived | Settings, Landing |

**Working branch:** `feat/real-questions` → merge to `main` → auto-deploys to Vercel

## ENVIRONMENT VARIABLES
Set in Vercel dashboard AND local `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://zgnygrbpmfnfwlraxjxe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set in Vercel>
CONTENT_BASE_PATH=./content
```

## QUESTION BANK STATUS: ✅ 1,000+ REAL QUESTIONS
- **Source:** 10 CFA Curriculum End of Chapter PDFs (pdf-parse v2)
- **Import script:** `npm run import:questions -- --file="path.pdf" --subject="Subject Name"`
- **Cleanup:** `npm run import:questions -- --clean` (removes questions without answers)
- **Storage:** JSON files in `content/metadata/imported-questions/*.json`
- **Browser loading:** `/api/imported-questions` route → localStorage `cfa-buddy-imported-questions`
- **Parser:** Hybrid approach (direct match for single-chapter, numbering-reset for multi-chapter)

### Import Results (Final):
| Subject | Questions | With Answers |
|---------|-----------|-------------|
| Quantitative Methods | 109 | 109 (100%) |
| Economics | 70 | 70 (100%) |
| Corporate Issuers | 23 | 23 (100%) |
| Financial Statement Analysis | 208 | 207 (99.5%) |
| Equity Investments | 180 | 180 (100%) |
| Fixed Income | 132 | 125 (94.7%) |
| Derivatives | 45 | 43 (95.6%) |
| Alternative Investments | 65 | 58 (89.2%) |
| Portfolio Management | 139 | 139 (100%) |
| Ethical and Professional Standards | 67 | 46 (68.7%) |
| **TOTAL** | **1,038** | **1,000 (96.3%)** |

### pdf-parse Usage (IMPORTANT):
The import script uses pdf-parse v2 with `createRequire`:
```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
// Usage: new PDFParse(new Uint8Array(buffer)) → .load() → .getText()
```
Do NOT use `import('pdf-parse')` or `require('pdf-parse')` directly — it breaks on Windows with tsx.

## CFA SUBJECT ORDER (Canonical)
Always display subjects in this order everywhere in the app:
1. Quantitative Methods
2. Economics
3. Corporate Issuers
4. Financial Statement Analysis
5. Equity Investments
6. Fixed Income
7. Derivatives
8. Alternative Investments
9. Portfolio Management
10. Ethical and Professional Standards

Source: `src/shared/config/subjects.ts` — use `sortByCfaOrder()` for any subject list.

## CRITICAL REACT RULES (NEVER VIOLATE)
1. **NEVER** use `useSyncExternalStore` for one-time localStorage reads. Use `useState(() => ...)` lazy initializer.
2. **NEVER** call `router.push()` during render phase. Only in `useEffect` or event handlers.
3. **NEVER** return `JSON.parse()` from a `getSnapshot` function. Cache at module level.
4. `createServerSupabaseClient()` returns **null** when Supabase not configured. Always check.
5. Always delete `.next` folder after pulling new code.
6. **NEVER** use `git push` via bash in Kiro sandbox. Use GitHub power tool `push_to_remote`.

## VERCEL DEPLOYMENT RULES
- Kiro commits are authored by "kiro-agent" — Vercel Hobby blocks these on private repos
- After Kiro pushes to a branch, the USER must: pull → make empty commit → push to main
- Or: keep repo PUBLIC (current state)
- Build command: `npx prisma generate && next build`
- Content folder doesn't exist on Vercel — app handles this gracefully (returns empty arrays)

## APP ARCHITECTURE
- **180+ TypeScript/TSX source files**
- **30 compiled routes**
- **Data Layer:** ALL user data in localStorage (offline-first)
- **Content:** 617 PDFs in `./content/` folder (gitignored, local only)
- **Questions:** 50 sample + 1,000 imported (loaded via API → localStorage)
- **Theme:** Dark/Light toggle via CSS variables
- **Colors:** Navy #002B5C, Gold #C5A258, Green #00843D, Background #0a0e14

## KEY FEATURES
- Question Bank: 8 test modes (Topic, Subject, Mixed, Quick, Random, Mock, AdaptiveRetest, WeakTopic)
- Mock CFA Exam: 90 questions, 135 min, curriculum-weighted
- Instant CFA-style feedback (green/red highlighting + explanations)
- Live per-question timer (turns red >90s)
- Navigation grid (clickable squares to jump between questions)
- Flashcards with SM-2 spaced repetition
- Formula Center (30 key CFA formulas)
- Revision Planner (spaced repetition per subject)
- Progress Insights (predicted score, time analysis)
- LOS Tracker (GitHub-style contribution grid)
- Study Timer widget
- Toast notifications
- PWA (installable, offline-capable)
- Keyboard shortcuts (j/k, Cmd+K search, ?)
- Data export/import/reset in Settings
- Mobile responsive (hamburger sidebar)

## COMMANDS CHEAT SHEET (Windows PowerShell)
```powershell
# Daily development
npm run dev                     # Start dev server

# After pulling new code
Remove-Item -Recurse -Force .next
npm install
npm run dev

# Import questions from PDF
npm run import:questions -- --file="content\question-banks\level1\2025 Curriculm End of Chapter Qts\6. Fixed Income.pdf" --subject="Fixed Income"

# Clean invalid questions
npm run import:questions -- --clean

# Verification
npx tsc --noEmit
npm run lint
npm run build
npm run test

# Deploy to production
git checkout main
git merge feat/real-questions
git push origin main
# Vercel auto-deploys from main
```

## KNOWN ISSUES (as of deployment)
1. **~38 questions without answers** — run `--clean` to remove them
2. **Ethics subject only 68.7% answer match** — parser needs tuning for that PDF's solution format
3. **"Unknown" subject** on some imported questions — re-import with `--subject` flag fixes it
4. **Supabase auth not wired** — app works 100% without auth (localStorage mode)

## LOCALSTORAGE KEYS
| Key | Content |
|-----|---------|
| `cfa-buddy-sessions` | Array of QuestionSession objects |
| `cfa-buddy-imported-questions` | 1,000+ imported Question objects |
| `cfa-buddy-exam-date` | Target exam date |
| `cfa-buddy-theme` | "dark" or "light" |
| `cfa-buddy-flashcards` | Flashcard objects (SM-2 data) |
| `cfa-buddy-formula-bookmarks` | Bookmarked formula IDs |
| `cfa-buddy-los-progress` | LOS status map |
| `cfa-buddy-revision-schedule` | Revision stages per subject |
| `cfa-buddy-study-timer` | Timer session records |
| `cfa-buddy-question-bookmarks` | Globally bookmarked question IDs |
| `cfa-buddy-recent-searches` | Last 5 search queries |
