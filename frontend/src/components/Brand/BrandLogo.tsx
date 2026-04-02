import brandMark from "../../assets/brand-mark.svg";

interface BrandLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  imageClassName?: string;
  wordmarkClassName?: string;
}

const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export default function BrandLogo({
  size = 28,
  showWordmark = false,
  className,
  imageClassName,
  wordmarkClassName,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={brandMark}
        alt="Aztec Assess logo"
        width={size}
        height={size}
        className={cn("block shrink-0 object-contain", imageClassName)}
      />
      {showWordmark && (
        <span className={cn("font-geist text-white", wordmarkClassName)}>
          Aztec Assess
        </span>
      )}
    </span>
  );
}
