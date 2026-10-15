import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-display text-5xl">That page is not here</h1>
      <p className="mt-3 text-ink/70">The hangout details and reservations live on the main pages.</p>
      <Link href="/" className="mt-6 inline-block text-burgundy">
        Back home
      </Link>
    </div>
  );
}
