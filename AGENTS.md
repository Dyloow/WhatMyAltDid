<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project rules

## i18n — Mandatory for ALL user-facing text

Every string displayed to the user **must** use the `t()` function from `useI18n()` (defined in `src/lib/i18n.tsx`). No hardcoded text in components — including tooltips, labels, placeholders, error messages, and button text. If a key doesn't exist yet, add it to **all 9 locales** (fr, en, de, es, pt, it, ru, ko, zh) before using it.
