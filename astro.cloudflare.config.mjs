import { defineConfig } from 'astro/config';

// https://astro.build/config
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [mdx(), tailwind()],
  site: 'https://ethangardner.io'
});