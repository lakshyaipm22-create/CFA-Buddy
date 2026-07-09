# Content Repository Rules

## Canonical Source of Truth

The `content/` folder is the single source of truth for all study materials.
The application adapts to this repository — never the other way around.

## Do NOT

- Modify the content folder structure without explicit user permission
- Move, rename, or reorganize files automatically
- Hardcode filenames in application code
- Push copyrighted PDFs to Git (they are .gitignored)
- Store application code in the content folder

## Architecture Principles

- Always scan folders dynamically at runtime or build time
- Tolerate new PDFs being added without code changes
- Infer subject, provider, level, and reading from folder names and filenames
- The application should build indexes automatically from folder scanning
- Future uploads should work automatically without code changes

## Content Hierarchy

The website should always assume this hierarchy:

```
Level → Provider/Content Type → Subject → Reading → Topic → Individual Resource
```

## Current Scope

- Fully support CFA Level I (2026 curriculum)
- Level II folders exist but are intentionally empty (architecture readiness)
- Level III will be added much later

## Folder Structure

```
content/
├── curriculum/       # Official CFA Institute Curriculum PDFs
│   ├── level1/       # 10 volumes (V1-V10) covering all subjects
│   └── level2/       # Empty (ready for future)
├── schweser/         # Kaplan Schweser study notes
│   ├── level1/       # 4 combined PDFs by subject groupings
│   └── level2/       # Empty
├── notes/            # Third-party coaching providers
│   ├── level1/
│   │   ├── fintree/      # Fintree Juice Notes (subject-level PDFs)
│   │   ├── ift/          # IFT Notes (organized by subject → LM## per reading)
│   │   ├── juice/        # Empty (juice notes are under fintree)
│   │   ├── mark-meldrum/ # Mark Meldrum notes (subject-level PDFs)
│   │   └── personal/     # User's own notes
│   └── level2/           # Empty (all providers)
├── question-banks/   # Practice questions from providers
│   ├── level1/
│   │   ├── 2025 Curriculm End of Chapter Qts/  # CFAI EOC by subject
│   │   ├── 25th HOUR QB/                        # 25th Hour summary QBs
│   │   ├── CFA L1 2025_Premium Practice Pack/   # CFAI Premium Practice
│   │   ├── Schweser QB 2024 with Answers/       # Schweser by subject/reading
│   │   └── UWORLD QBANK 2024/                   # UWorld by subject/reading
│   └── level2/      # Empty
├── mocks/            # Full mock examinations
│   ├── level1/
│   │   ├── KEVIN SIR_s MOCK/      # Kevin Sir mocks (Session 1 & 2)
│   │   ├── Schweser Mocks 2024/   # 6 Schweser mocks with answers
│   │   └── Unknown Mocks/         # Unidentified mock provider
│   └── level2/      # Empty
├── formulas/         # Formula sheets
│   ├── level1/       # QM formula sheet
│   └── level2/       # Empty
└── metadata/         # Generated metadata and indexing files
    └── content-index.json
```

## Filename Patterns (for parser inference)

### Curriculum
- Pattern: `cfa-program2026L1V{n}-{subject}.pdf`
- Example: `cfa-program2026L1V4-FSA.pdf`

### IFT Notes
- Pattern: `{subject_folder}/LM{nn} {Reading Title} IFT Notes.pdf`
- Subject folders: `01 - Quantitative Methods`, `02 - Economics`, etc.
- Example: `04 - Financial Statement Analysis/LM01 Introduction to Financial Statement Analysis IFT Notes.pdf`

### Mark Meldrum
- Pattern: `2024-L1-{Subject}.pdf`
- Example: `2024-L1-FSA.pdf`

### Fintree Juice Notes
- Pattern: `L1 - JN - {Subject} 2024 V1.pdf`
- Example: `L1 - JN - Financial Statement Analysis 2024 V1.pdf`

### Schweser
- Combined subject PDFs: `CFA 2025 Level I - {Subjects}.pdf`
- Example: `CFA 2025 Level I - Quants, Eco, CI.pdf`

### Question Banks (Schweser)
- Pattern: `Reading {nn} {Title}.pdf` and `Reading {nn} {Title} - Answers.pdf`
- Organized by subject subfolder

### Question Banks (UWorld)
- Pattern: `{n}.{nn} {Title}.pdf` and `{n}.{nn} {Title} - Answers.pdf`
- Subject number prefix: 1=QM, 2=Eco, 3=PM, 4=CI, 5=FSA, 6=Equity, 7=FI, 9=AI

### Mocks
- Pattern: `Mock Exam {n}.pdf` and `Mock Exam {n} - Answers.pdf`
- Or: `Mock {n} – Morning.pdf`, `Mock {n} - Afternoon - Answers.pdf`

## Subject Mapping

The CFA L1 curriculum has 10 subjects:
1. Quantitative Methods (QM, Quants)
2. Economics (Eco)
3. Corporate Issuers (CI, Corp Issuers)
4. Financial Statement Analysis (FSA)
5. Equity Investments (Equity)
6. Fixed Income (FI)
7. Derivatives (Deriv)
8. Alternative Investments (AI, Alt Investments)
9. Portfolio Management (PM, Port Mgmt)
10. Ethical and Professional Standards (Ethics)

## Personal Use Only

This is NOT a SaaS product. Not for commercial distribution.
Single user initially, multi-user architecture for future flexibility.
