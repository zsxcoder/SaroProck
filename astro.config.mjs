import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import compress from "@playform/compress";
import terser from "@rollup/plugin-terser";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeKatex from "rehype-katex";

import remarkMath from "remark-math";

// https://astro.build/config
export default defineConfig({
  site: "https://www.zsxcoder.top",
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    esbuild: {
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      jsxInject: 'import React from "react";',
    },
  },

  integrations: [
    expressiveCode(),
    mdx(),
    react({
      jsxImportSource: 'react',
    }),
    sitemap(),
    compress(),
    terser({ compress: true, mangle: true }),
    icon(),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
