/**
 * Lightweight WebP scenes for hangout heroes when no custom cover is set.
 * Kept under ~100KB each so first paint stays quick.
 */
export const SCENE_BACKGROUNDS = [
  "/landing-card1.webp",
  "/landing-card2.webp",
  "/landing-card3.webp",
  "/landing-circle.webp",
  "/landing-circle-a.webp",
  "/landing-circle-b.webp",
] as const;

export type SceneBackground = (typeof SCENE_BACKGROUNDS)[number];

/** Pick a random scene for this request / page load. */
export function pickSceneBackground(seed?: number): SceneBackground {
  const list = SCENE_BACKGROUNDS;
  const index =
    typeof seed === "number" && Number.isFinite(seed)
      ? Math.abs(Math.floor(seed)) % list.length
      : Math.floor(Math.random() * list.length);
  return list[index] ?? list[0];
}
