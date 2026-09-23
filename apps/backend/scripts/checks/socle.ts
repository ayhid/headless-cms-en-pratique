// Controles supplementaires du SOCLE (exemple du format pour les autres agents).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { CheckFn } from './types';

const MIN_MCP_VERSION = '5.47.0';

function gte(a: string, b: string) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return true;
}

const check: CheckFn = async (ctx) => {
  const version = JSON.parse(
    // Monorepo : @strapi/strapi est remonte dans le node_modules de la racine du depot, on le resout comme Node.
    readFileSync(createRequire(join(ctx.root, 'package.json')).resolve('@strapi/strapi/package.json'), 'utf8'),
  ).version as string;
  return [
    {
      ok: gte(version, MIN_MCP_VERSION),
      message: `Version Strapi ${version} (${MIN_MCP_VERSION} minimum requise pour le serveur MCP)`,
    },
  ];
};

export default check;
