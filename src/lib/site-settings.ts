import { query } from "./db";

export type SocialSettings = {
  instagram: string;
  facebook: string;
};

const KEYS = {
  instagram: "social_instagram_url",
  facebook: "social_facebook_url",
} as const;

function normalizeUrl(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "#") return "#";
  return trimmed;
}

export async function getSocialSettings(): Promise<SocialSettings> {
  const result = await query<{ key: string; value: string }>(
    `SELECT key, value FROM site_settings WHERE key = ANY($1::text[])`,
    [[KEYS.instagram, KEYS.facebook]],
  );
  const map = new Map(result.rows.map((row) => [row.key, row.value]));

  const fromDbInstagram = map.get(KEYS.instagram);
  const fromDbFacebook = map.get(KEYS.facebook);

  return {
    instagram: normalizeUrl(
      fromDbInstagram !== undefined ? fromDbInstagram : process.env.SOCIAL_INSTAGRAM_URL,
    ),
    facebook: normalizeUrl(
      fromDbFacebook !== undefined ? fromDbFacebook : process.env.SOCIAL_FACEBOOK_URL,
    ),
  };
}

export async function saveSocialSettings(input: {
  instagram?: string;
  facebook?: string;
}): Promise<SocialSettings> {
  const next = {
    instagram: normalizeUrl(input.instagram),
    facebook: normalizeUrl(input.facebook),
  };

  await query(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [KEYS.instagram, next.instagram === "#" ? "" : next.instagram],
  );
  await query(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [KEYS.facebook, next.facebook === "#" ? "" : next.facebook],
  );

  return getSocialSettings();
}
