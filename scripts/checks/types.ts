// Contrat des controles charges automatiquement par `npm run demo:check`.
// Chaque agent ajoute scripts/checks/<agent>.ts avec :
//
//   import type { CheckFn } from './types';
//   const check: CheckFn = async (ctx) => {
//     const res = await ctx.fetchJson('/api/articles', { token: ctx.env.STRAPI_READ_TOKEN });
//     return { ok: res.status === 200, message: 'Message lisible en francais' };
//   };
//   export default check;
//
// La fonction peut renvoyer un resultat ou un tableau de resultats. Une exception = KO.

export type CheckResult = { ok: boolean; message: string };

export type CheckContext = {
  /** Racine du depot */
  root: string;
  /** .env racine fusionne avec process.env */
  env: Record<string, string>;
  /** ex. http://localhost:1337 */
  strapiUrl: string;
  /** ex. http://localhost:3000 */
  frontendUrl: string;
  /** fetch JSON vers Strapi (chemin relatif) ou une URL absolue ; `token` ajoute le header Bearer */
  fetchJson: (path: string, init?: RequestInit & { token?: string }) => Promise<{ status: number; body: any }>;
  /** JWT de l'admin de demo (login POST /admin/login, mis en cache) */
  adminJwt: () => Promise<string>;
};

export type CheckFn = (ctx: CheckContext) => Promise<CheckResult | CheckResult[]>;
