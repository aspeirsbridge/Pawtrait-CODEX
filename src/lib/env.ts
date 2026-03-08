type RequiredClientEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

let cachedClientEnv: RequiredClientEnv | null = null;

const missing = (name: string) =>
  `${name} is missing. Add it to your .env file and rebuild the app.`;

const invalid = (name: string, reason: string) =>
  `${name} is invalid: ${reason}`;

function validateSupabaseUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(missing("VITE_SUPABASE_URL"));
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(invalid("VITE_SUPABASE_URL", "must be a valid URL"));
  }

  if (parsed.protocol !== "https:") {
    throw new Error(invalid("VITE_SUPABASE_URL", "must use https://"));
  }

  if (!parsed.hostname.endsWith("supabase.co")) {
    throw new Error(
      invalid(
        "VITE_SUPABASE_URL",
        "must point to your Supabase project domain"
      )
    );
  }

  if (parsed.hostname.includes("your-project") || parsed.hostname.includes("example")) {
    throw new Error(
      invalid(
        "VITE_SUPABASE_URL",
        "appears to be a placeholder, not a real project URL"
      )
    );
  }

  return trimmed;
}

function validatePublishableKey(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(missing("VITE_SUPABASE_PUBLISHABLE_KEY"));
  }

  const looksLikeJwt = trimmed.startsWith("eyJ") && trimmed.split(".").length === 3;
  const looksLikePublishable = trimmed.startsWith("sb_publishable_");

  if (!looksLikeJwt && !looksLikePublishable) {
    throw new Error(
      invalid(
        "VITE_SUPABASE_PUBLISHABLE_KEY",
        "expected a Supabase anon JWT or sb_publishable_ key"
      )
    );
  }

  if (trimmed.length < 20) {
    throw new Error(
      invalid("VITE_SUPABASE_PUBLISHABLE_KEY", "value is too short to be valid")
    );
  }

  return trimmed;
}

export function validateClientEnv(): RequiredClientEnv {
  return {
    supabaseUrl: validateSupabaseUrl(import.meta.env.VITE_SUPABASE_URL ?? ""),
    supabasePublishableKey: validatePublishableKey(
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""
    ),
  };
}

export function getClientEnv(): RequiredClientEnv {
  if (!cachedClientEnv) {
    cachedClientEnv = validateClientEnv();
  }

  return cachedClientEnv;
}
