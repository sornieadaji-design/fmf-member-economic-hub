import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * FMF logo (public/fmf-logo.jpg). The source has a light-grey backdrop, so render it on
 * a matching muted tile to blend cleanly. Intrinsic size is 1600×1520; the display size
 * is controlled with a height class (e.g. `h-8`).
 */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-muted p-1">
      <Image
        src="/fmf-logo.jpg"
        alt="Forum of Makurdi Friends Economic Hub"
        width={1600}
        height={1520}
        priority={priority}
        className={cn("h-10 w-auto", className)}
      />
    </span>
  );
}
