import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { EnhancedPawLoader } from "@/components/EnhancedPawLoader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getUserFriendlyErrorMessage, runApi } from "@/lib/api";
import filterOriginal from "@/assets/filter-preview-original.jpg";
import filterWatercolor from "@/assets/filter-preview-watercolor.jpg";
import filterSketch from "@/assets/filter-preview-sketch.jpg";
import filterBanksy from "@/assets/filter-preview-banksy.jpg";
import filterPicasso from "@/assets/filter-preview-picasso.jpg";

interface FilterStyle {
  id: string;
  name: string;
  description: string;
  gradient: string;
  preview: string;
}

const filterStyles: FilterStyle[] = [
  {
    id: "original",
    name: "Original",
    description: "Keep your photo as is",
    gradient: "from-gray-400 to-gray-600",
    preview: filterOriginal,
  },
  {
    id: "watercolor",
    name: "Watercolor",
    description: "Soft painting effect",
    gradient: "from-blue-400 to-purple-500",
    preview: filterWatercolor,
  },
  {
    id: "sketch",
    name: "Sketch",
    description: "Pencil drawing style",
    gradient: "from-slate-500 to-zinc-700",
    preview: filterSketch,
  },
  {
    id: "banksy",
    name: "Street Art",
    description: "Banksy-inspired graffiti",
    gradient: "from-red-500 to-orange-600",
    preview: filterBanksy,
  },
  {
    id: "picasso",
    name: "Cubist",
    description: "Picasso-inspired art",
    gradient: "from-yellow-400 to-pink-500",
    preview: filterPicasso,
  },
];

const Filters = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const state = location.state as { imageUrl?: string; fileName?: string } | null;
    if (state?.imageUrl) {
      setImageUrl(state.imageUrl);
    } else {
      navigate("/");
    }
  }, [location, navigate]);

  const handleFilterSelect = async (filterId: string) => {
    setSelectedFilter(filterId);
    setIsProcessing(true);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 0);

    try {
      const data = await runApi(async () => {
        const { data, error } = await supabase.functions.invoke("apply-filter", {
          body: {
            imageUrl,
            filterId,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.imageUrl) {
          throw new Error("No image URL returned");
        }

        return data;
      }, {
        operation: "Apply filter",
        timeoutMs: 45_000,
        retries: 1,
      });

      toast.success("Filter applied successfully!");

      navigate("/edit", {
        state: {
          imageUrl: data.imageUrl,
          filterId,
          filterName: filterStyles.find((f) => f.id === filterId)?.name,
        },
      });
    } catch (error) {
      console.error("Filter error:", error);
      toast.error(getUserFriendlyErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border z-10 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Choose Your Style</h1>
            <p className="text-sm text-muted-foreground">
              Select an artistic filter
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        <div className={cn(
          "relative rounded-3xl overflow-hidden shadow-soft transition-all duration-300",
          isProcessing ? "min-h-[500px]" : ""
        )}>
          {!isProcessing && (
            <img
              src={imageUrl}
              alt="Pet preview"
              className="w-full max-h-96 object-contain"
            />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm">
              <EnhancedPawLoader
                message="Applying filter..."
                previewImage={imageUrl}
                estimatedDuration={30}
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-6 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Art Styles</h2>
        </div>

        {filterStyles.map((filter, index) => (
          <button
            key={filter.id}
            onClick={() => handleFilterSelect(filter.id)}
            disabled={isProcessing}
            className="w-full group animate-slide-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center gap-4 bg-card hover:bg-card/80 rounded-2xl p-4 border-2 border-border hover:border-primary transition-all duration-300 hover:scale-[1.02] shadow-soft disabled:opacity-50 disabled:cursor-not-allowed">
              <img
                src={filter.preview}
                alt={`${filter.name} preview`}
                className="w-16 h-16 rounded-xl object-cover shadow-lg"
              />
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-foreground">{filter.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {filter.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Filters;
