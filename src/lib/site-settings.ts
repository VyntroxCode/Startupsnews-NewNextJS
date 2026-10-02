import { SiteSettingsRepository } from '@/modules/site-settings/repository/site-settings.repository';

const repo = new SiteSettingsRepository();

export const FOOTER_COPYRIGHT_KEY = 'footer_copyright_text';
export const DEFAULT_FOOTER_COPYRIGHT = '© {{year}} Dotfyi Media Ventures Pvt Ltd';
const FEATURE_STARTUP_STEP1_KEY = 'feature_startup_hero_step1';
const FEATURE_STARTUP_STEP2_KEY = 'feature_startup_hero_step2';

/** The admin-set copyright template (may contain `{{year}}`); the default on no row or DB error. */
export async function getFooterCopyrightTemplate(): Promise<string> {
  try {
    const values = await repo.getMany([FOOTER_COPYRIGHT_KEY]);
    return values.get(FOOTER_COPYRIGHT_KEY)?.trim() || DEFAULT_FOOTER_COPYRIGHT;
  } catch (error) {
    console.error('Error fetching footer copyright setting:', error);
    return DEFAULT_FOOTER_COPYRIGHT;
  }
}

/** Footer copyright ready to render, with `{{year}}` filled in. Read on the server so the text is
 * in the HTML instead of being swapped in after hydration. */
export async function getFooterCopyrightText(): Promise<string> {
  const template = await getFooterCopyrightTemplate();
  return template.replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
}

/** Admin CDN overrides for the Feature Your Startup hero images; '' means "use the bundled image". */
export async function getFeatureStartupImages(): Promise<{ step1: string; step2: string }> {
  try {
    const values = await repo.getMany([FEATURE_STARTUP_STEP1_KEY, FEATURE_STARTUP_STEP2_KEY]);
    return {
      step1: values.get(FEATURE_STARTUP_STEP1_KEY) || '',
      step2: values.get(FEATURE_STARTUP_STEP2_KEY) || '',
    };
  } catch (error) {
    console.error('Error fetching feature-startup-images setting:', error);
    return { step1: '', step2: '' };
  }
}
