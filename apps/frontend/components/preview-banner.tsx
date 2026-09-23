import { draftMode } from "next/headers";
import { ExitPreviewLink } from "./exit-preview-link";

// Visible on every page while Next.js Draft Mode is on (cookie __prerender_bypass).
export async function PreviewBanner() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;

  return (
    <aside
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 bg-amber-400 px-6 py-3 text-lg font-semibold text-zinc-900 shadow"
    >
      <span>Mode aperçu : brouillon</span>
      <ExitPreviewLink />
    </aside>
  );
}
