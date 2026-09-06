import { CountryFlag } from "@/components/CountryFlag";

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
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {codes.map((code) => (
        <CountryFlag key={code} code={code} className="h-5 w-[30px]" />
      ))}
    </span>
  );
}
