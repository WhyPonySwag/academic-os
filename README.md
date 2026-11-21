# ACADEMIC OS

Local-first academic workspace for schedules, courses, assignments, deadlines, calendar events and project materials.

## Technology

- Next.js App Router, React, TypeScript
- SQLite for local academic records
- Playwright for browser tests
- Tailwind CSS and reusable UI components

## Repository status

The GitHub repository is being prepared to receive the existing local application source. The source code and local data are separate: the academic database and personal materials must remain on the user's device.

## Data protection

**This is a public repository.** Never commit or upload:

- SQLite databases, WAL/SHM files or backups
- Telegram/VK chat exports, student records, personal documents or photographs containing private information
- `.env` files, passwords, API keys, access tokens or other credentials
- Generated test reports and temporary data

The repository's `.gitignore` and CI file-path checks help prevent accidental inclusion, but they are not substitutes for checking files **before** publication. CI checks only run after data reaches GitHub.

## Development

After the application source is uploaded, GitHub Actions will run TypeScript, ESLint, Playwright and the Next.js production build on pushes and pull requests. Work on changes in separate branches and merge reviewed pull requests into `main`.

A Windows source-only publisher is available at [scripts/publish-from-windows.ps1](scripts/publish-from-windows.ps1). It stages a fresh copy of allowlisted application files without pushing the local project's Git history, databases or incoming documents.
