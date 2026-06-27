# blog

A minimal Astro blog: Markdown in, type-checked at build time, deployed by
pushing to `main`.

## One-time setup, before your first push

1. **Create the GitHub repo** (e.g. `blog`) under your account.
2. In **Settings → Pages**, set "Build and deployment" → Source to
   **GitHub Actions**. (You only do this once; the workflow in
   `.github/workflows/deploy.yml` handles every deploy after that.)
3. Edit `astro.config.mjs`: set `GITHUB_USERNAME` and `REPO_NAME` to match
   your account and the repo name you just created.
4. Edit the placeholder `your-name-here` text in `src/layouts/BaseLayout.astro`,
   `src/pages/index.astro`, and `src/pages/rss.xml.js`.
5. Delete or rewrite `src/content/blog/sample-post.md`.
6. `git init`, commit, push to `main`. Check the Actions tab — first deploy
   takes a minute or two. Your site is then at
   `https://<username>.github.io/<repo-name>/`.

If you ever rename the repo to exactly `<username>.github.io`, delete the
`base` line in `astro.config.mjs` — that variant serves from the domain
root, not a sub-path.

## Day to day

```bash
npm run dev      # local dev server with live reload
npm run build    # production build to ./dist — run this before pushing
                  # if you want to catch schema/type errors before they're public
npm run preview  # serve the production build locally
```

**Writing a post:** add a `.md` file under `src/content/blog/`. Required
frontmatter is enforced by the schema in `src/content.config.ts`:

```yaml
---
title: "..."
description: "..."
pubDate: 2026-06-27
tags: ["fp", "typescript"]
draft: false   # true hides it from the build without deleting the file
---
```

Get a field wrong — bad date format, missing title — and `npm run build`
fails with a schema error instead of shipping a broken page. That's the
point of the schema, not an accident.

**Publishing:** commit, push to `main`. The GitHub Actions workflow builds
and deploys automatically. No separate deploy step.

## Structure

```
src/
  content.config.ts        # the frontmatter schema (the "type system" for posts)
  content/blog/*.md        # the posts
  layouts/
    BaseLayout.astro        # html shell, nav, fonts, footer
    PostLayout.astro        # post header + the metadata "signature line"
  pages/
    index.astro             # post list
    blog/[...slug].astro    # individual post route
    rss.xml.js              # RSS feed
  styles/global.css         # design tokens
```

## Adding things later

- **Custom domain:** add a `CNAME` file under `public/` with your domain, set
  it in repo Settings → Pages, then drop the `base` line in
  `astro.config.mjs` (custom domains serve from the root).
- **MDX / interactive embeds:** `npx astro add mdx` (or a React/Svelte
  integration) when you want to drop a live component into a post — the
  Islands architecture means it ships zero extra JS until you do.
- **Search:** Pagefind is the standard low-effort option for static sites
  once there's enough content to need it.
