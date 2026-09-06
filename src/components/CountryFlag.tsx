import * as FlagIcons from "country-flag-icons/react/3x2";
import { countryName } from "@/lib/flags";

type CountryFlagProps = {
  code?: string | null;
  className?: string;
};

/** A consistently rendered SVG country flag. */
export function CountryFlag({ code, className = "h-4 w-6" }: CountryFlagProps) {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) return null;

  const Flag = FlagIcons[normalized as keyof typeof FlagIcons];
  if (typeof Flag !== "function") return null;

  const label = countryName(normalized);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`${className} inline-flex shrink-0 overflow-hidden rounded-[2px] ring-1 ring-border`}
    >
      <Flag className="h-full w-full" aria-hidden="true" />
    </span>
  );
}