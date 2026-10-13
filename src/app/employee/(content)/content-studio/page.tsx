import { StudioShell } from '@/modules/content-studio/components/shell/StudioShell';
import { isConfigured, modelName } from '@/modules/content-studio/lib/llm/azureOpenAI';

// Same screen as the admin panel's /admin/content-studio — access is decided by the (content) layout
// and, for every call that does work, by the /api/admin/content-studio/* routes.
// Read at request time, for the reason given on the admin page.
export const dynamic = 'force-dynamic';

export default function EmployeeContentStudioPage() {
  return <StudioShell configured={isConfigured()} model={modelName()} />;
}
