import { forwardRef, type ReactNode } from "react";

interface CardShellProps {
  gradient: string;
  eyebrow?: string;
  children: ReactNode;
  textClassName?: string;
}

const CardShell = forwardRef<HTMLDivElement, CardShellProps>(function CardShell(
  { gradient, eyebrow, children, textClassName = "text-white" },
  ref
) {
  return (
    <div
      ref={ref}
      className={`relative isolate flex h-full w-full flex-col justify-center gap-5 overflow-hidden px-6 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-8 ${gradient} ${textClassName}`}
    >
      <div className="wa-wallpaper absolute inset-0 -z-20 opacity-80" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,20,26,0.24),rgba(11,20,26,0.9))]" />
      {eyebrow && (
        <p className="wa-kicker">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-1 flex-col justify-center gap-5">{children}</div>
    </div>
  );
});

export default CardShell;
