interface BrandMarkProps {
  size?: "sm" | "md";
}

export default function BrandMark({ size = "sm" }: BrandMarkProps) {
  const dimensions = size === "md" ? "h-[18px] w-[18px] text-[8px]" : "h-4 w-4 text-[7px]";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-mono font-black leading-none text-primary-ink ${dimensions}`}
    >
      WA
    </span>
  );
}
