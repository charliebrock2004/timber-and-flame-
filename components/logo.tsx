import Image from "next/image";
import logoLight from "@/public/images/logo-light.png";
import logoDark from "@/public/images/logo.png";

/** The Timber & Flame wordmark, taken from the business's own logo artwork. */
export function Logo({
  tone = "light",
  className,
  priority,
  sizes = "200px",
}: {
  tone?: "light" | "dark";
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={tone === "light" ? logoLight : logoDark}
      alt="Timber & Flame Firewood"
      className={className}
      priority={priority}
      sizes={sizes}
    />
  );
}
