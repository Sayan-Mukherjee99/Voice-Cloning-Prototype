import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2.5 max-w-full mx-auto min-h-0",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  className,
  children,
  header,
  icon,
  title,
  description,
  glowColor,
  style,
}: {
  className?: string;
  children?: ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
  title?: string | ReactNode;
  description?: string | ReactNode;
  glowColor?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden min-h-0 border border-white/10 bg-[#0A0F24]/85 shadow-lg backdrop-blur-md transition-all duration-300 flex flex-col justify-between",
        className
      )}
      style={{
        boxShadow: glowColor ? `0 0 24px ${glowColor}` : "0 4px 20px rgba(0,0,0,0.3)",
        ...style,
      }}
    >
      {/* Subtle top light ray line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: glowColor
            ? `linear-gradient(90deg, transparent, ${glowColor.split("rgba(")[1]?.split(",0")[0] ?? "rgba(255,255,255"}0.4), transparent)`
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        }}
      />
      {header}
      {children}
    </div>
  );
};
