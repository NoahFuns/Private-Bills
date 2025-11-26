/** @type {import('next').NextConfig} */
const resolveBasePath = () => {
  const envBase = process.env.NEXT_PUBLIC_BASE_PATH;
  if (typeof envBase !== "undefined") return envBase;

  const repo = (process.env.GITHUB_REPOSITORY || "").split("/")[1] || "";
  const owner = process.env.GITHUB_REPOSITORY_OWNER || "";
  if (!repo || !owner) return "";

  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  return isUserSite ? "" : `/${repo}`;
};

const basePath = resolveBasePath();

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  experimental: {
    optimizePackageImports: ["ethers"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
      {
        source: "/:path*.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;


