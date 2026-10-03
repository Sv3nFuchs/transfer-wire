import { User } from "lucide-react";

type PlayerPhotoProps = {
  name: string;
  url?: string | null;
  className?: string;
};

/** Portrait photo with a silhouette fallback when no photo is set. */
export function PlayerPhoto({ name, url, className = "h-40 w-32" }: PlayerPhotoProps) {
  if (url) {
    return (
      <img
        src={url}
        alt={`Photo of ${name}`}
        className={`${className} shrink-0 rounded-lg bg-secondary object-cover object-top`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground`}
    >
      <User className="size-1/2" strokeWidth={1.5} />
    </span>
  );
}
