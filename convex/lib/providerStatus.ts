/**
 * Pure env inspection shared by the model router (Node actions) and the
 * system status query (Convex runtime). Must not import provider SDKs.
 */
export type ProviderId = "google" | "anthropic" | "openai";

export const PROVIDER_ENV_KEYS: Record<ProviderId, string> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

type EnvLike = Record<string, string | undefined>;

export function configuredProviders(env: EnvLike = process.env): ProviderId[] {
  return (Object.keys(PROVIDER_ENV_KEYS) as ProviderId[]).filter((provider) =>
    Boolean(env[PROVIDER_ENV_KEYS[provider]]?.trim()),
  );
}

export function hasAnyProviderKey(env: EnvLike = process.env): boolean {
  return configuredProviders(env).length > 0;
}
