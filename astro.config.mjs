import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://radiantalphadigital.com',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
});
