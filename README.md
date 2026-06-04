# Powerhouse

Premium marketing site for Powerhouse — AI automation studio for Indian B2B SaaS founders.

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **Framer Motion** (scroll reveals, nav, hero)
- **Geist** via `next/font` (Apple-adjacent typography)

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

### Vercel (recommended)

```bash
npx vercel
```

### Netlify

```bash
npm run build
# Connect repo; Netlify uses @netlify/plugin-nextjs via netlify.toml
```

## Project structure

```
src/
  app/          layout, page, globals.css (mesh, glass, bento patterns)
  components/   Nav, Hero, Bento, Process, CTA, Team, …
  lib/          cn() utility
```

Legacy static HTML is in `_legacy/`.
