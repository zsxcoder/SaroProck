
let __unconfig_data;
let __unconfig_stub = function (data = {}) { __unconfig_data = data };
__unconfig_stub.default = (data = {}) => { __unconfig_data = data };
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
const __unconfig_default =  defineConfig({
  site: "https://www.zsxcoder.top",
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    expressiveCode(),
    mdx(),
    react(),
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

if (typeof __unconfig_default === "function") __unconfig_default(...[]);export default __unconfig_data;