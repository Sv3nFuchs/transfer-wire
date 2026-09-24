import type { SVGProps } from "react";

/**
 * lucide-react has no soccer ball icon (only "Volleyball"), so this is a
 * small hand-drawn one matching lucide's visual conventions: 24x24 viewBox,
 * 2px stroke, round caps, colored via currentColor so it composes with
 * regular text/background color classes.
 */
export function SoccerBall({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.8 15.05 11.01 13.88 14.59 10.12 14.59 8.95 11.01Z" fill="currentColor" strokeWidth="1" />
    </svg>
  );
}
