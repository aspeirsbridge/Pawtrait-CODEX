import { cn } from "@/lib/utils";

interface PawLoaderProps {
  message?: string;
  className?: string;
}

export const PawLoader = ({ message = "Creating your Pawtrait...", className }: PawLoaderProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="relative w-20 h-20">
        {/* Animated paw prints */}
        <div className="absolute inset-0 animate-spin">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-gradient-primary rounded-full"
              style={{
                top: `${50 + 35 * Math.cos((i * Math.PI) / 2)}%`,
                left: `${50 + 35 * Math.sin((i * Math.PI) / 2)}%`,
                transform: "translate(-50%, -50%)",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-gradient-secondary rounded-full animate-pulse-soft" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse-soft">
        {message}
      </p>
    </div>
  );
};
