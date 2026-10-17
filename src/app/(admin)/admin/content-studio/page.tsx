import { StudioShell } from '@/modules/content-studio/components/shell/StudioShell';
import { isConfigured, modelName } from '@/modules/content-studio/lib/llm/azureOpenAI';
import { Monitor } from 'lucide-react';
import Link from 'next/link';

// Read at request time: the key is set in the server env, and a page prerendered at build time
// would keep reporting whatever the env held when the build ran.
export const dynamic = 'force-dynamic';

// Content Studio — AI post drafting. A server component only so the Azure OpenAI env can be reduced to
// a boolean and the deployment name here; the key never reaches the client bundle. Access is enforced by
// the admin layout (isPathAllowed) and, for every call that does work, by CONTENT_STUDIO_ROLES on
// the /api/admin/content-studio/* routes.
// Phones (below md) get a "use a larger screen" note instead: the studio's side-by-side panes don't fit.
export default function ContentStudioPage() {
  return (
    <>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center md:hidden">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50">
          <Monitor size={26} color="#4f46e5" aria-hidden />
        </div>
        <h2 className="m-0 text-xl font-bold text-slate-900">Content Studio needs a larger screen</h2>
        <p className="m-0 max-w-xs text-sm text-slate-500">It works side by side in several panes. Open it on a laptop or desktop to draft posts.</p>
        <Link href="/admin/posts" className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-indigo-500 px-5 text-sm font-semibold text-white no-underline visited:text-white">
          Back to Posts
        </Link>
      </div>
      <div className="hidden md:contents">
        <StudioShell configured={isConfigured()} model={modelName()} />
      </div>
    </>
  );
}
