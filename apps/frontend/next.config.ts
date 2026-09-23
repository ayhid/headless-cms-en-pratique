import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empeche `next dev` de reecrire AGENTS.md (le bloc genere contient un tiret cadratin,
  // interdit dans ce depot ; demo:check le verifie). Le contenu utile est conserve dans AGENTS.md.
  agentRules: false,
  // Monorepo npm workspaces : une partie des dependances du front (tailwindcss, etc.) est remontee dans le
  // node_modules de la racine du depot, qui doit donc etre la racine Turbopack (sinon elles sont introuvables).
  // next, react et react-dom 19 restent dans apps/frontend/node_modules (voir docs/handoff/socle.md).
  turbopack: { root: path.join(__dirname, "..", "..") },
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  images: {
    // Images servies par Strapi en local (media library, provider upload local)
    remotePatterns: [{ protocol: "http", hostname: "localhost", port: "1337", pathname: "/uploads/**" }],
  },
};

export default nextConfig;
