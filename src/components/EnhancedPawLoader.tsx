import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import mascotDog from "@/assets/mascot-dog-transparent.png";
import mascotCat from "@/assets/mascot-cat-transparent.png";
import mascotParrot from "@/assets/mascot-parrot-transparent.png";
import mascotGoldfish from "@/assets/mascot-goldfish-transparent.png";

interface EnhancedPawLoaderProps {
  message?: string;
  className?: string;
  previewImage?: string;
  estimatedDuration?: number; // in seconds
}

const petQuotes = [
  "Adding extra floof to your photo... 🐾",
  "Teaching old dogs new tricks... 🎨",
  "Fetching artistic vibes... 🎭",
  "Purr-fecting every pixel... 😺",
  "Wagging our creative tails... 🐕",
  "Squawk! Making it picture-perfect... 🦜",
  "Unleashing the artist within... 🎨",
  "Paws-ing for artistic excellence... 🐾",
  "Meow-gical transformations in progress... ✨",
  "Ruffing up some creativity... 🐶",
  "Polly wants a masterpiece! 🦜",
  "Nine lives, infinite art styles... 😸",
];

export const EnhancedPawLoader = ({
  message = "Creating your Pawtrait...",
  className,
  previewImage,
  estimatedDuration = 30,
}: EnhancedPawLoaderProps) => {
  const [progress, setProgress] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [bounces, setBounces] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  // Progress simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        // Slow down as we approach 100%
        const increment = prev < 70 ? 2 : prev < 90 ? 0.5 : 0.2;
        return Math.min(prev + increment, 95);
      });
    }, (estimatedDuration * 1000) / 100);

    return () => clearInterval(interval);
  }, [estimatedDuration]);

  // Quote cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % petQuotes.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Calculate remaining time
  const remainingTime = Math.ceil((estimatedDuration * (100 - progress)) / 100);

  const handleMascotClick = () => {
    setBounces((prev) => prev + 1);
    
    // Easter egg after 5 taps
    if (bounces >= 4) {
      setShowEasterEgg(true);
      setTimeout(() => setShowEasterEgg(false), 2000);
      setBounces(0);
    }
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Blurred Preview Background */}
      {previewImage && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110"
            style={{ backgroundImage: `url(${previewImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[300px] px-6 py-4">
        {/* Animated Pet Mascot */}
        <button
          onClick={handleMascotClick}
          className="relative mb-4 focus:outline-none touch-manipulation active:scale-95 transition-transform"
          aria-label="Tap for fun animation"
        >
          <div
            className={cn(
              "relative w-32 h-32 transition-all duration-300",
              bounces > 0 && "animate-bounce"
            )}
          >
            {/* Main mascot - rotating between dog, cat, parrot, goldfish */}
            <div className="absolute inset-0 animate-float flex items-center justify-center">
              {currentQuote % 4 === 0 && (
                // Dog
                <img 
                  src={mascotDog} 
                  alt="Dog mascot" 
                  className="w-full h-full object-contain select-none drop-shadow-xl animate-fade-in"
                />
              )}
              {currentQuote % 4 === 1 && (
                // Cat
                <img 
                  src={mascotCat} 
                  alt="Cat mascot" 
                  className="w-full h-full object-contain select-none drop-shadow-xl animate-fade-in"
                />
              )}
              {currentQuote % 4 === 2 && (
                // Parrot
                <img 
                  src={mascotParrot} 
                  alt="Parrot mascot" 
                  className="w-full h-full object-contain select-none drop-shadow-xl animate-fade-in"
                />
              )}
              {currentQuote % 4 === 3 && (
                // Goldfish
                <img 
                  src={mascotGoldfish} 
                  alt="Goldfish mascot" 
                  className="w-full h-full object-contain select-none drop-shadow-xl animate-fade-in"
                />
              )}
            </div>

            {/* Sparkles around mascot */}

            {/* Easter Egg - Heart explosion */}
            {showEasterEgg && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 text-3xl animate-ping"
                    style={{
                      transform: `rotate(${i * 45}deg) translateY(-40px)`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    ❤️
                  </div>
                ))}
              </div>
            )}
          </div>
        </button>

        {/* Main Message */}
        <h3 className="text-xl font-bold mb-2 text-center animate-fade-in">
          {message}
        </h3>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-4 space-y-2">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">
              {Math.round(progress)}% complete
            </span>
            {remainingTime > 0 && (
              <span className="text-muted-foreground">
                ~{remainingTime}s remaining
              </span>
            )}
          </div>
        </div>

        {/* Cycling Quotes */}
        <div className="relative h-16 w-full max-w-md overflow-hidden">
          {petQuotes.map((quote, index) => (
            <p
              key={index}
              className={cn(
                "absolute inset-0 text-center text-sm text-muted-foreground transition-all duration-500 px-4 flex items-center justify-center",
                index === currentQuote
                  ? "opacity-100 translate-y-0"
                  : index === (currentQuote - 1 + petQuotes.length) % petQuotes.length
                  ? "opacity-0 -translate-y-4"
                  : "opacity-0 translate-y-4"
              )}
            >
              {quote}
            </p>
          ))}
        </div>

        {/* Paw Print Trail */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 opacity-30">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="text-xl animate-pulse-soft"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              🐾
            </div>
          ))}
        </div>

        {/* Tap Hint */}
        <p className="absolute bottom-2 text-xs text-muted-foreground/60 animate-pulse-soft">
          Tap the mascot for a surprise! 🎉
        </p>
      </div>
    </div>
  );
};
