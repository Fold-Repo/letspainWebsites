export const brand = "Let's All Paints";

export function supportEmail() {
  return process.env.SUPPORT_EMAIL || "hello@letsallpaints.com";
}

export function publicSiteUrl() {
  return (process.env.PUBLIC_SITE_URL || "http://localhost:3010").replace(/\/$/, "");
}

export function socialLinks() {
  return {
    instagram: (process.env.SOCIAL_INSTAGRAM_URL || "").trim(),
    facebook: (process.env.SOCIAL_FACEBOOK_URL || "").trim(),
  };
}
