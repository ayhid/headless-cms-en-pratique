import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empeche `next dev` de reecrire AGENTS.md (le bloc genere contient un tiret cadratin,
  // interdit dans ce depot ; demo:check le verifie). Le contenu utile est conserve dans AGENTS.md.
  agentRules: false,
  // Le depot contient deux package-lock.json (Strapi a la racine, front ici) : on fixe la racine Turbopack.
  turbopack: { root: path.join(__dirname) },
  images: {
    // Images servies par Strapi en local (media library, provider upload local)
    remotePatterns: [{ protocol: "http", hostname: "localhost", port: "1337", pathname: "/uploads/**" }],
  },
};

export default nextConfig;
