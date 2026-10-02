import { StudioShell } from '@/modules/content-studio/components/shell/StudioShell';
import { isConfigured, modelName } from '@/modules/content-studio/lib/llm/azureOpenAI';

// Read at request time: the key is set in the server env, and a page prerendered at build time
// would keep reporting whatever the env held when the build ran.
export const dynamic = 'force-dynamic';

// Content Studio — AI post drafting. A server component only so the Azure OpenAI env can be reduced to
// a boolean and the deployment name here; the key never reaches the client bundle. Access is enforced by
// the admin layout (isPathAllowed) and, for every call that does work, by CONTENT_STUDIO_ROLES on
// the /api/admin/content-studio/* routes.
export default function ContentStudioPage() {
  return <StudioShell configured={isConfigured()} model={modelName()} />;
}
