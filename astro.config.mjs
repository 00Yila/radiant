import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://radiantalphadigital.com',
  // Comps are internal review pages: noindex, disallowed in robots.txt, and
  // kept out of the sitemap too — submitting a page we ask not to be indexed
  // is a contradiction, and /comps/gold was being listed.
  integrations: [sitemap({ filter: (page) => !page.includes('/comps/') })],
  build: { inlineStylesheets: 'auto' },
});
