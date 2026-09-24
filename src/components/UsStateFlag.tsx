import { usStateFlagUrl, usStateName } from "@/lib/us-states";

type UsStateFlagProps = {
  code?: string | null;
  className?: string;
};

/** A US state flag, hotlinked from Wikimedia Commons. */
export function UsStateFlag({ code, className = "h-4 w-6" }: UsStateFlagProps) {
  const url = usStateFlagUrl(code);
  const label = usStateName(code);
  if (!url || !label) return null;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`${className} inline-flex shrink-0 overflow-hidden rounded-[2px] ring-1 ring-border`}
    >
      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
    </span>
  );
}
