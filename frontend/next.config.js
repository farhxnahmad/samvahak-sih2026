/** @type {import('next').NextConfig} */

// Static export for GitHub Pages. Only active when GITHUB_PAGES=true (set by the
// deploy workflow), so `npm run dev` / `npm run build` / `npm start` behave as before.
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "";

const nextConfig = {
  reactStrictMode: true,
  ...(isPages && {
    output: "export",
    basePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

module.exports = nextConfig;