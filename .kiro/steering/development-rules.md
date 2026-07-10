# CFA Buddy — Development Rules & Power Usage

## Project Identity
- **Repo:** lakshyaipm22-create/CFA-Buddy
- **Branch:** feat/phase1-implementation  
- **Spec:** .kiro/specs/cfa-buddy-phase1/ (requirements.md, design.md, tasks.md)
- **Framework:** Next.js 16, React 19, TypeScript strict, Tailwind CSS, Supabase
- **Theme:** CFA Navy #002B5C, Gold #C5A258, Green #00843D, Background #0a0e14
- **Logo:** public/CFA Buddy_logo.png

## Critical React Rules (NEVER violate)

1. **NEVER** use `useSyncExternalStore` for one-time localStorage reads.
   - Use `useState(() => readFromLocalStorage())` lazy initializer instead.
   - useSyncExternalStore is ONLY for subscribing to stores that change over time.

2. **NEVER** call `router.push()` or `router.replace()` during the render phase.
   - Only call inside `useEffect` or event handler callbacks.
   - Calling during render → infinite re-render loop.

3. **NEVER** return `JSON.parse()` directly from a `getSnapshot` function.
   - Always cache at module level. Compare raw string, only re-parse when changed.
   - New references on every call → React thinks store changed → infinite loop.

4. **`createServerSupabaseClient()` returns `null`** when Supabase is not configured.
   - Every caller MUST check for null immediately after the call.
   - Provide graceful fallback (default data, "not configured" message).

5. **ALWAYS** delete `.next` folder after pulling new page files.
   - Next.js caches route resolution. New pages show 404 with stale cache.
   - Remind the user: "Delete .next after pulling."

## Power Usage Guide

### Supabase Power
Use when: Writing database queries, RLS policies, migrations, auth flows.
How: `kiro_powers activate "Build a backend with Supabase"` then use its tools.
Best for: Schema design, Prisma-to-Supabase patterns, RLS policy generation.

### Context7 Power  
Use when: Need current documentation for Next.js, React, Tailwind, Prisma, Supabase.
How: `kiro_powers activate "Context7"` → `resolve-library-id` → `query-docs`
Best for: Checking if an API has changed, finding correct import paths, verifying patterns.
Example: "How does useActionState work in React 19?" → Context7 gives current docs.

### Tavily Web Search Power
Use when: Need to find solutions to specific errors, check latest package versions, research best practices.
How: `kiro_powers activate "Web Search with Tavily"` → `tavily-search`
Best for: Error messages you can't solve, "is there a better library for X", checking breaking changes.
Example: "Next.js 16 middleware deprecated" → Tavily finds the migration guide.

### When NOT to use powers
- Don't use Tavily for things you already know
- Don't use Context7 for basic React patterns
- Don't use Supabase power unless actively writing DB code
- Powers cost context window space — only activate when needed

## Code Quality Standards

### Before Every Commit
```bash
npx tsc --noEmit        # 0 errors
npm run lint             # 0 warnings  
npm run build            # Production build passes
npm run test             # All tests pass
```

### Architecture Rules
- Feature-based folders: `src/features/{name}/`
- No cross-feature imports (extract to `src/shared/`)
- Server Actions for mutations (no REST endpoints except search + scanner)
- Content-index.json is source of truth for resources (not database yet)
- localStorage for user data until Supabase DB is connected

### What to AVOID
- TODOs, placeholders, mock services
- `useEffect` + `setState` for localStorage (use lazy useState)
- Inline `new Date()` in render (impure, causes hydration mismatch)
- `useSyncExternalStore` for anything other than reactive subscriptions
- Calling async functions or router methods during render

## Content Architecture
- 617 PDFs in `content/` folder (gitignored)
- Scanner: `npm run scan:content` (8 provider parsers)
- Import: `npm run import:questions -- --file="path.pdf"`
- All paths normalized to forward slashes (Windows compatible)
- Scanner invariant: index only contains files currently on disk

## Session Management
- Always start by checking: `git log --oneline -5` to see current state
- Always verify build passes before implementing new features
- Work in milestones (3-6 hours of logical work, not tiny tasks)
- Stop when: architectural decision needed, credentials needed, manual testing needed
- Never commit without user approval

## Remaining Tasks (Phase 1)
- Task 13: Question Bank Analytics (charts, progress timeline)
- More sample questions across all subjects
- Keyboard shortcuts (j/k/b/n/? help modal)
- Connect real Supabase DB (prisma migrate deploy + seed)
- Final polish and Vercel deployment
