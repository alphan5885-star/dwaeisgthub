# Contributing

## Setup

```bash
npm install
cp .env.example .env
npm run dev:light
```

## Before Editing

Run quick orientation commands:

```bash
npm run doctor
npm run routes
npm run map
```

## Before Handoff

```bash
npm run typecheck
npm run build
```

Use `npm run todos` to list known TODO/FIXME markers.

## Style

- Prefer existing components in `src/components/ui`.
- Keep route files in `src/routes` thin; put page UI in `src/pages`.
- Keep shared state/providers in `src/lib`.
- Do not commit `.env` or local secrets.
- Do not manually edit `src/routeTree.gen.ts` unless absolutely necessary.
