# Content Directory

This directory holds all CFA study materials organized by provider and level.

## Structure

```
content/
├── curriculum/          # Official CFA Institute curriculum PDFs
│   ├── level1/
│   └── level2/
│
├── schweser/            # Kaplan Schweser notes and study materials
│   ├── level1/
│   └── level2/
│
├── notes/               # Third-party coaching provider notes
│   ├── level1/
│   │   ├── ift/         # IFT (Irfanullah) notes
│   │   ├── mark-meldrum/  # Mark Meldrum notes
│   │   ├── fintree/     # Fintree notes
│   │   ├── juice/       # Juice Notes (Fintree summaries)
│   │   └── personal/    # Your own notes
│   └── level2/
│       └── ... (same structure)
│
├── question-banks/      # Practice questions by provider
│   ├── level1/
│   └── level2/
│
├── mocks/               # Full-length mock exams
│   ├── level1/
│   └── level2/
│
├── formulas/            # Formula sheets and quick references
│   ├── level1/
│   └── level2/
│
└── metadata/            # Content index and mapping files (committed to Git)
    └── content-index.json
```

## Usage

1. Place your PDF files in the appropriate folders
2. The `.gitignore` ensures PDFs are NOT committed to Git (copyright protection)
3. Only the folder structure (`.gitkeep`) and metadata are version-controlled
4. The CFA Buddy app will read from these folders or from Supabase Storage

## Important

⚠️ **Do NOT commit copyrighted PDFs to Git** — even in a private repository.

The app is designed to:
- Import content from this local folder structure
- Upload to Supabase Storage (private, RLS-protected buckets)
- Serve content through the app's Resource Library

## Adding Content

Simply drop your files into the correct folder:

| Material | Folder |
|----------|--------|
| CFA Institute books | `curriculum/level1/` |
| Schweser notes | `schweser/level1/` |
| IFT notes | `notes/level1/ift/` |
| Mark Meldrum PDFs | `notes/level1/mark-meldrum/` |
| Fintree notes | `notes/level1/fintree/` |
| Juice summaries | `notes/level1/juice/` |
| Your notes | `notes/level1/personal/` |
| Question bank PDFs | `question-banks/level1/` |
| Mock exams | `mocks/level1/` |
| Formula sheets | `formulas/level1/` |
