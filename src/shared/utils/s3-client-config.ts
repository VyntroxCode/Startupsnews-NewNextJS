import type { S3ClientConfig } from '@aws-sdk/client-s3';

/**
 * Shared S3 client configuration.
 *
 * - When AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are set (EC2 today, local dev) they are used
 *   explicitly, with surrounding quotes stripped as before.
 * - Otherwise `credentials` is omitted so the SDK's default provider chain resolves them
 *   (Lambda / ECS execution role, instance profile, SSO profile). On Lambda the two key names
 *   are reserved and role credentials also need a session token, which only the chain supplies.
 */

function clean(v: string | undefined): string {
  return (v ?? '').trim().replace(/^["']|["']$/g, '').trim();
}

export function s3Region(): string {
  return clean(process.env.AWS_REGION) || 'us-east-1';
}

export function hasExplicitAwsKeys(): boolean {
  return !!clean(process.env.AWS_ACCESS_KEY_ID) && !!clean(process.env.AWS_SECRET_ACCESS_KEY);
}

/**
 * True when S3 calls can be signed: explicit keys, or a runtime that provides role credentials
 * through the default chain (Lambda, ECS, web identity), or an explicit opt-in.
 */
export function s3CredentialsAvailable(): boolean {
  return (
    hasExplicitAwsKeys() ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
    !!process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI ||
    !!process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
    process.env.S3_USE_DEFAULT_CREDENTIALS === 'true'
  );
}

export function s3ClientConfig(region: string = s3Region()): S3ClientConfig {
  if (hasExplicitAwsKeys()) {
    return {
      region,
      credentials: {
        accessKeyId: clean(process.env.AWS_ACCESS_KEY_ID),
        secretAccessKey: clean(process.env.AWS_SECRET_ACCESS_KEY),
      },
    };
  }
  return { region };
}
