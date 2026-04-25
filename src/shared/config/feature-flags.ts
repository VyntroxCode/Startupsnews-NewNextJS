/**
 * Feature flags for cron and RSS.
 */

export interface FeatureFlags {
  ENABLE_CRON: boolean;
  ENABLE_RSS_PROCESSING: boolean;
  ENABLE_IMAGE_DOWNLOAD: boolean;
}

function getFlag(key: keyof FeatureFlags, defaultVal: boolean = true): boolean {
  const v = process.env[key];
  if (v === undefined) return process.env.NODE_ENV === 'production' ? false : defaultVal;
  const n = v.toLowerCase().trim();
  return n === 'true' || n === '1' || n === 'yes' || n === 'on';
}

export const featureFlags: FeatureFlags = {
  ENABLE_CRON: getFlag('ENABLE_CRON', true),
  ENABLE_RSS_PROCESSING: getFlag('ENABLE_RSS_PROCESSING', true),
  ENABLE_IMAGE_DOWNLOAD: getFlag('ENABLE_IMAGE_DOWNLOAD', true),
};

export function validateFeatureFlags(): void {
  Object.entries(featureFlags).forEach(([key, value]) => {
    console.log(`   ${key}: ${value ? '✅ ENABLED' : '❌ DISABLED'}`);
  });
}
