// Entry point of the Strapi "Aperçu" button (config/admin.ts > preview.config.handler).
//   GET /api/preview?secret=<PREVIEW_SECRET>&slug=<slug>&locale=fr|en&status=draft|published
// - wrong or missing secret: 401
// - status=published: Draft Mode off, redirect to the public page
// - otherwise: the slug must exist in Strapi (draft version, preview token), then Draft Mode on
//   and redirect to the page computed here (never to a URL taken from the query: no open redirect).
import { timingSafeEqual } from "node:crypto";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { articlePath, DEFAULT_LOCALE, findArticleForPreview, homePath, isLocale, StrapiError } from "@/lib/strapi";

function sameSecret(received: string | null) {
  const expected = process.env.PREVIEW_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function text(body: string, status: number) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (!sameSecret(params.get("secret"))) {
    return text("Secret d'aperçu invalide ou absent (PREVIEW_SECRET).", 401);
  }

  const rawLocale = params.get("locale");
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const slug = params.get("slug");
  const status = params.get("status");
  const draft = await draftMode();

  let target = homePath(locale);
  if (slug) {
    let found: { slug: string } | null;
    try {
      found = await findArticleForPreview(slug, locale);
    } catch (err) {
      const message = err instanceof StrapiError ? err.message : "erreur inattendue";
      return text(`Aperçu impossible : ${message}`, 502);
    }
    if (!found) {
      return text(`Aucun article « ${slug} » en ${locale} dans Strapi, même en brouillon.`, 404);
    }
    target = articlePath(found.slug, locale);
  }

  if (status === "published") {
    draft.disable();
  } else {
    draft.enable();
  }
  redirect(target);
}
