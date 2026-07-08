import { forwardRef, type ReactNode } from "react";

interface CardShellProps {
  eyebrow?: string;
  children: ReactNode;
  /** Extra classes for the outer surface, e.g. an inverted green card. */
  className?: string;
}

/**
 * Full-bleed editorial page: mono header rule up top, grain texture,
 * content column centered between the deck's progress bar and controls.
 */
const CardShell = forwardRef<HTMLDivElement, CardShellProps>(function CardShell(
  { eyebrow, children, className = "bg-background text-foreground" },
  ref
) {
  return (
    <div
      ref={ref}
      className={`grain relative isolate flex h-full w-full flex-col overflow-hidden px-5 pb-[calc(env(safe-area-inset-bottom)+5.25rem)] pt-[calc(env(safe-area-inset-top)+3.5rem)] sm:px-8 ${className}`}
    >
      {eyebrow && (
        <div className="relative z-10 flex items-center justify-between border-b border-current/20 pb-2">
          <p className="mono-label">{eyebrow}</p>
          <p className="mono-label opacity-50">WA Wrapped</p>
        </div>
      )}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-5 pt-4">
        {children}
      </div>
    </div>
  );
});

export default CardShell;
