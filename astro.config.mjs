// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// EDIT THESE TWO LINES before your first deploy:
const GITHUB_USERNAME = 'marianudo';
const REPO_NAME = 'types-jedi-blog'; // must match the GitHub repo name exactly

export default defineConfig({
  // Used to build canonical URLs, the sitemap, and the RSS feed.
  site: `https://${GITHUB_USERNAME}.github.io`,
  // Project repos (anything except <username>.github.io) are served from a
  // sub-path on GitHub Pages, so every internal link needs this prefix.
  // If you ever rename the repo to exactly `${GITHUB_USERNAME}.github.io`,
  // delete this line — it'll live at the domain root instead.
  base: `/${REPO_NAME}`,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: true,
    },
  },
});
