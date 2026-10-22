import Image from "next/image";
import { eventCoverUrl, hasCustomCover, type Hangout } from "@/lib/hangout";

type Props = {
  event: Pick<Hangout, "imageUrl" | "name">;
  /** Override cover URL (e.g. a random light scene background). */
  src?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function EventCover({
  event,
  src: srcOverride,
  className = "",
  sizes = "(max-width: 768px) 100vw, 480px",
  priority,
}: Props) {
  const custom = hasCustomCover(event);
  const src = custom ? eventCoverUrl(event) : srcOverride || eventCoverUrl(event);
  const useNativeImg = src.startsWith("http") || src.startsWith("/api/");

  return (
    <div className={`relative overflow-hidden bg-burgundy/10 ${className}`}>
      {useNativeImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={custom ? event.name : ""} className="h-full w-full object-cover" />
      ) : (
        <Image
          src={src}
          alt={custom ? event.name : "Painting hangout scene"}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      )}
      {!custom ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-burgundy/35 via-transparent to-transparent" />
      ) : null}
    </div>
  );
}
