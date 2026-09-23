// Controles supplementaires du SOCLE (exemple du format pour les autres agents).
import { readFileSync } from 'node:fs';
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
    readFileSync(join(ctx.root, 'node_modules', '@strapi', 'strapi', 'package.json'), 'utf8'),
  ).version as string;
  return [
    {
      ok: gte(version, MIN_MCP_VERSION),
      message: `Version Strapi ${version} (>= ${MIN_MCP_VERSION} requise pour le serveur MCP)`,
    },
  ];
};

export default check;
