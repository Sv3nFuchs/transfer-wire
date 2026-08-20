import { countryName, flagEmoji } from "@/lib/flags";

export function PlayerFlags({
  flags,
  className = "",
}: {
  flags: (string | null | undefined)[];
  className?: string;
}) {
  const codes = flags.filter((code): code is string => Boolean(code));
  if (codes.length === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {codes.map((code) => (
        <span key={code} title={countryName(code)} aria-label={countryName(code)} role="img">
          {flagEmoji(code)}
        </span>
      ))}
    </span>
  );
}
