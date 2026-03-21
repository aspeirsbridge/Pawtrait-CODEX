import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Crop, RotateCw, Undo } from "lucide-react";
import { EnhancedPawLoader } from "@/components/EnhancedPawLoader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getUserFriendlyErrorMessage, runApi } from "@/lib/api";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
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
    description: "Stencil street-art mural",
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);

  const extractFunctionErrorMessage = async (error: unknown): Promise<string | null> => {
    if (!error || typeof error !== "object" || !("context" in error)) {
      return null;
    }

    const context = (error as { context?: unknown }).context;
    if (!(context instanceof Response)) {
      return null;
    }

    try {
      const payload = await context.clone().json() as { error?: string; message?: string };
      return payload.error || payload.message || null;
    } catch {
      try {
        const text = await context.clone().text();
        return text || null;
      } catch {
        return null;
      }
    }
  };

  useEffect(() => {
    const state = location.state as { imageUrl?: string; fileName?: string } | null;
    if (state?.imageUrl) {
      setImageUrl(state.imageUrl);
    } else {
      navigate("/");
    }
  }, [location, navigate]);

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL("image/png");
  };

  const handleRotate = () => {
    if (!imageUrl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      canvas.width = img.height;
      canvas.height = img.width;

      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        setImageHistory((prev) => [...prev, imageUrl]);
        setImageUrl(canvas.toDataURL("image/png"));
        toast.success("Image rotated");
      }
    };

    img.src = imageUrl;
  };

  const handleCropApply = async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
      setImageHistory((prev) => [...prev, imageUrl]);
      setImageUrl(croppedImage);
      setShowCropDialog(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      toast.success("Crop applied");
    } catch (error) {
      console.error("Crop error:", error);
      toast.error("Failed to crop image");
    }
  };

  const handleUndo = () => {
    if (imageHistory.length === 0) return;

    const previousImage = imageHistory[imageHistory.length - 1];
    setImageHistory((prev) => prev.slice(0, -1));
    setImageUrl(previousImage);
    toast.success("Last change undone");
  };

  const handleFilterSelect = async (filterId: string) => {
    if (!imageUrl) return;

    setIsProcessing(true);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 0);

    try {
      const data = await runApi(
        async () => {
          const { data, error } = await supabase.functions.invoke("apply-filter", {
            body: {
              imageUrl,
              filterId,
            },
          });

          if (error) {
            const detailedMessage = await extractFunctionErrorMessage(error);
            throw new Error(detailedMessage || error.message || "Failed to apply filter");
          }

          if (!data?.imageUrl) {
            throw new Error("No image URL returned");
          }

          return data;
        },
        {
          operation: "Apply filter",
          timeoutMs: 45_000,
          retries: 1,
        }
      );

      toast.success("Filter applied successfully!");

      navigate("/edit", {
        state: {
          imageUrl: data.imageUrl,
          filterId,
          filterName: filterStyles.find((f) => f.id === filterId)?.name,
          originalImageUrl: imageUrl,
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
            <p className="text-sm text-muted-foreground">Select an artistic filter</p>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        <div
          className={cn(
            "relative rounded-3xl overflow-hidden shadow-soft transition-all duration-300",
            isProcessing ? "min-h-[500px]" : ""
          )}
        >
          {!isProcessing && (
            <img src={imageUrl} alt="Pet preview" className="w-full max-h-96 object-contain" />
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm">
              <EnhancedPawLoader message="Applying filter..." previewImage={imageUrl} estimatedDuration={30} />
            </div>
          )}
        </div>
      </div>

      <div className="px-6 space-y-3 mb-6">
        <div className="bg-card rounded-2xl p-4 border border-border shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-foreground">Adjust Before Styling</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCropDialog(true)}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <Crop className="h-4 w-4" />
              Crop
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Rotate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={isProcessing || imageHistory.length === 0}
              className="flex items-center gap-2"
            >
              <Undo className="h-4 w-4" />
              Undo
            </Button>
          </div>
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
                <p className="text-sm text-muted-foreground">{filter.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="relative h-[400px] w-full bg-black">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Zoom:</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCropDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCropApply}>Apply Crop</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Filters;
