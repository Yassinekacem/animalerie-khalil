import { Star } from "lucide-react";

export type ReviewSummary = { averageRating: number | null; reviewCount: number };

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return <span className="inline-flex shrink-0 items-center gap-0.5" aria-hidden="true">
    {[1, 2, 3, 4, 5].map(star => {
      const filled = value >= star;
      const half = !filled && value >= star - 0.5;
      return <span key={star} className="relative inline-block" style={{ width: size, height: size }}>
        <Star size={size} className="absolute inset-0 text-gray-300" fill="currentColor" strokeWidth={0} />
        {(filled || half) && <span className="absolute inset-0 overflow-hidden" style={{ width: filled ? size : size / 2 }}>
          <Star size={size} className="text-[#FFB400]" fill="currentColor" strokeWidth={0} />
        </span>}
      </span>;
    })}
  </span>;
}

export default function ProductRating({ averageRating, reviewCount }: ReviewSummary) {
  const rated = reviewCount > 0 && averageRating !== null;
  const score = rated ? averageRating.toFixed(1).replace(".", ",") : null;
  const label = rated ? `Note moyenne : ${score} sur 5, ${reviewCount} avis` : "Aucun avis pour ce produit";
  return <div role="img" aria-label={label} title={label} className="mt-2 flex h-10 shrink-0 flex-wrap content-center items-center gap-x-1.5 gap-y-0 text-[10px] leading-4 text-gray-500 tabular-nums sm:h-6 sm:text-[11px]">
    <Stars value={averageRating ?? 0} size={12} />
    <span aria-hidden="true" className="whitespace-nowrap">{rated ? <><span className="font-semibold text-gray-700">{score}</span> <span>({reviewCount} avis)</span></> : "Aucun avis"}</span>
  </div>;
}
