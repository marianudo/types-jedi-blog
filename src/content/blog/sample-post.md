---
title: "Sample post — replace me"
description: "A placeholder post that exercises the pipeline: frontmatter, tags, and a fenced code block."
pubDate: 2026-06-27
tags: ["meta"]
draft: false
---

This file exists to prove the pipeline works end to end: a Markdown file with
frontmatter goes in, a validated, statically rendered page comes out. Delete
it once you've published something real — or flip `draft: true` above and it
disappears from the build without deleting anything.

Try breaking it on purpose: remove `pubDate`, or write `pubDate: "not a date"`,
and run `npm run build`. The schema in `src/content.config.ts` should reject
it at build time rather than letting a malformed post through silently —
that's the whole point of putting a schema in front of the content.

A fenced code block, to check the syntax theme:

```ts
type IllegalState = never;

// A value that simply cannot be constructed if the invariant doesn't hold.
declare function assertNever(x: IllegalState): never;
```
