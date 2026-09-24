// Addabill site: Astro wrapper for Webflow Cloud.
// output 'server' plus the Cloudflare based adapter, so every page is answered by the
// server rendered catch-all in src/pages/[...slug].astro (no static directory files,
// so no trailing slash redirect loop on Webflow Cloud). Static files live in /public.
// Note: @webflow/astro is not published on npm (checked 2026-09-24), so the build uses
// @astrojs/cloudflare, which is what the Webflow Cloud Astro adapter is based on.
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: 'https://addabill.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  vite: { build: { assetsInlineLimit: 0 } }
});
