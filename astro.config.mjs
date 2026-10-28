import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://brezmadeza.si',
  output: 'server',
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: { server: { allowedHosts: ['localhost', '127.0.0.1'] } },
});
