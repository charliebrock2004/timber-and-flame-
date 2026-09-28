import Image from "next/image";

/**
 * Product image. Uses the real photo when one is set in /admin/products;
 * otherwise draws a simple illustration so we never fake a product photo.
 */
export function ProductVisual({
  image,
  visual,
  name,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  image: string | null;
  visual: string;
  name: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (image) {
    return (
      <Image src={image} alt={`${name} from Timber & Flame, Crieff`} fill sizes={sizes} priority={priority} className="object-cover" />
    );
  }
  return (
    <div className="woodgrain absolute inset-0 grid place-items-center" role="img" aria-label={`${name} illustration`}>
      {visual === "kindling" ? <Kindling /> : visual === "salt" ? <Salt /> : <Logs />}
    </div>
  );
}

function Kindling() {
  // Split kindling sticks inside a netted bag, tied at the top.
  const sticks = Array.from({ length: 11 }, (_, i) => i);
  const bag = "M58 30 Q100 22 142 30 L158 120 Q100 136 42 120 Z";
  return (
    <svg viewBox="0 0 200 150" className="h-3/5 w-auto drop-shadow-[0_10px_18px_rgba(0,0,0,.45)]" aria-hidden>
      <defs>
        <clipPath id="kindling-bag">
          <path d={bag} />
        </clipPath>
        <pattern id="kindling-net" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0H10M0 0V10" stroke="#c9454a" strokeWidth="1.6" fill="none" />
        </pattern>
      </defs>
      <g clipPath="url(#kindling-bag)">
        <rect x="30" y="20" width="140" height="120" fill="#5e3c2b" />
        {sticks.map((i) => {
          const x = 44 + i * 11 + (i % 2) * 2;
          const tilt = (i - 5) * 1.4;
          return (
            <g key={i} transform={`rotate(${tilt} ${x} 80)`}>
              <rect x={x - 4} y={24 + (i % 3) * 4} width="9" height={110 - (i % 3) * 6} rx="2" fill={i % 2 ? "#d6b48a" : "#c79f72"} />
            </g>
          );
        })}
        <rect x="30" y="20" width="140" height="120" fill="url(#kindling-net)" />
      </g>
      <path d={bag} fill="none" stroke="#972530" strokeWidth="2.5" />
      <path d="M86 26 Q100 8 114 26" fill="none" stroke="#3f6b3f" strokeWidth="3" strokeLinecap="round" />
      <path d="M92 25 Q100 14 108 25" fill="none" stroke="#3f6b3f" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Salt() {
  return (
    <svg viewBox="0 0 200 160" className="h-3/5 w-auto drop-shadow-[0_10px_18px_rgba(0,0,0,.45)]" aria-hidden>
      <path d="M52 30 Q100 18 148 30 L156 140 Q100 152 44 140 Z" fill="#f4ede4" />
      <path d="M52 30 Q100 18 148 30 L150 44 Q100 34 50 44 Z" fill="#d9c9bb" />
      <rect x="66" y="70" width="68" height="44" rx="4" fill="none" stroke="#3a6ea5" strokeWidth="3" />
      <text x="100" y="89" textAnchor="middle" fontFamily="Arial Narrow, Impact, sans-serif" fontSize="15" fontWeight="700" fill="#3a6ea5">
        ROAD
      </text>
      <text x="100" y="107" textAnchor="middle" fontFamily="Arial Narrow, Impact, sans-serif" fontSize="15" fontWeight="700" fill="#3a6ea5">
        SALT
      </text>
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={62 + i * 10} cy={132 + (i % 2) * 3} r="2" fill="#d9c9bb" />
      ))}
    </svg>
  );
}

function Logs() {
  return (
    <svg viewBox="0 0 200 140" className="h-3/5 w-auto" aria-hidden>
      {[
        [70, 95],
        [130, 95],
        [100, 50],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="30" fill="#8a5a3c" />
          <circle cx={cx} cy={cy} r="24" fill="#d6b48a" />
          <circle cx={cx} cy={cy} r="15" fill="none" stroke="#b58c62" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="7" fill="none" stroke="#b58c62" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}
