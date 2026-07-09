# AGENTS

## Project overview
- This is a small Next.js 16 + React 19 + TypeScript app for currency conversion.
- Styling uses Tailwind CSS with shadcn-style UI primitives in components/ui.
- Data comes from the Frankfurter API in the converter UI.

## Structure
- app/: app router pages and layout.
- components/: feature components and reusable UI primitives.
- lib/: shared helpers/utilities.
- public/: static assets.

## Coding conventions
- Prefer functional components only; no class components.
- Use TypeScript types/interfaces and keep them close to the relevant logic.
- Follow the existing naming style: PascalCase for components, camelCase for functions/variables, UPPER_CASE for constants.
- Keep components small and focused; reuse existing UI primitives from components/ui when possible.
- Match the current style: double quotes, no semicolons, Tailwind classes, and concise JSX.

## Rules for agents
- Write all user-facing UI text and code comments in Polish.
- Keep prompts and commit messages in English.
- Do not add new dependencies without an explicit request.
- Prefer minimal changes that fit the existing design and structure.
- If you touch UI, keep the experience simple and consistent with the current visual style.

## Run locally
- Install dependencies: pnpm install
- Start dev server: pnpm dev
- Open http://localhost:3000

## Podgląd na żywo

Dostępna publicznie wersja aplikacji (hostowana na Vercel):

https://currency-converter-app-delta-livid.vercel.app/

Możesz otworzyć link, aby przetestować przelicznik, wykresy kursów oraz funkcje trybu podróżnika i ulubionych par walut.
