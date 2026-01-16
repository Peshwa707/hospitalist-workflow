# Hospitalist Workflow

A personal web app to reduce documentation burden for hospitalist physicians through AI-assisted note generation and clinical analysis.

## Features

- **Progress Note Generator** - Enter brief clinical details → generate complete SOAP notes
- **Discharge Summary Generator** - Key hospitalization info → comprehensive discharge summaries
- **Admission Note Analyzer** - Paste admission notes → get differential diagnosis, workup recommendations, consult suggestions

## Tech Stack

- Next.js 15 + React 19
- Tailwind CSS + shadcn/ui
- Claude API (Haiku for generation, Sonnet for analysis)
- SQLite for local note persistence

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

3. Create your environment file:
   ```bash
   cp .env.local.example .env.local
   ```

4. Add your Anthropic API key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api...
   ```

5. Run the development server:
   ```bash
   bun dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Safety Considerations

- All AI-generated content displays prominent "AI Draft - Review before use" warnings
- Content is visually distinguished with dashed borders and amber badges
- No PHI storage - use patient initials only, never MRNs
- API key is server-side only, never exposed to client
- SQLite database is local and excluded from git

## Project Structure

```
hospitalist-workflow/
├── app/
│   ├── page.tsx                # Dashboard
│   ├── progress/page.tsx       # Progress note generator
│   ├── discharge/page.tsx      # Discharge summary generator
│   ├── analyze/page.tsx        # Admission note analyzer
│   ├── history/page.tsx        # Note history
│   └── api/                    # API routes
├── components/
│   ├── ui/                     # shadcn components
│   ├── notes/                  # Note forms and displays
│   └── analyzer/               # Analysis result components
├── lib/
│   ├── db.ts                   # SQLite setup
│   ├── types.ts                # TypeScript interfaces
│   └── prompts/                # AI system prompts
└── .env.local                  # API key (not in git)
```

## License

Personal use only.
