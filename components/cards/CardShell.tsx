import type { ReactNode } from "react";

interface CardShellProps {
  gradient: string; // Tailwind gradient classes
  eyebrow?: string;
  children: ReactNode;
  textClassName?: string;
}

export default function CardShell({
  gradient,
  eyebrow,
  children,
  textClassName = "text-white",
}: CardShellProps) {
  return (
    <div
      className={`flex h-full w-full flex-col justify-center gap-6 px-8 py-16 ${gradient} ${textClassName}`}
    >
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-70">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-1 flex-col justify-center gap-6">{children}</div>
    </div>
  );
}
