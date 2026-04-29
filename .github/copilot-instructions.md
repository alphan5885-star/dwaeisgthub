# Copilot Instructions

This is a TanStack Start + React + Vite + Supabase app.

Use npm by default:

```bash
npm install
npm run dev:light
```

Prefer these helper commands before broad edits:

```bash
npm run doctor
npm run routes
npm run map
```

Project conventions:

- Route files live in `src/routes`.
- Page components live in `src/pages`.
- Shared providers and helpers live in `src/lib`.
- UI primitives live in `src/components/ui`.
- Do not manually edit `src/routeTree.gen.ts`.
- Keep secrets out of git. Use `.env.example` as the public template.
- Prefer `dev:light` for fast iteration in AI-assisted IDEs.
