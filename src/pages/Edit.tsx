import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Save, Share2, Sparkles, Crop, RotateCw, Undo } from "lucide-react";
import { EnhancedPawLoader } from "@/components/EnhancedPawLoader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

const Edit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [filterName, setFilterName] = useState<string>("");
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [imageHistory, setImageHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    const state = location.state as { imageUrl?: string; filterId?: string; filterName?: string } | null;
    if (state?.imageUrl) {
      setImageUrl(state.imageUrl);
      setFilterName(state.filterName || "Original");
    } else {
      navigate("/");
    }
  }, [location, navigate, user, authLoading]);

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

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return canvas.toDataURL("image/png");
  };

  const handleCropApply = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels, rotation);
      setImageHistory(prev => [...prev, imageUrl]);
      setImageUrl(croppedImage);
      setShowCropDialog(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      toast.success("Image cropped successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image");
    }
  };

  const handleRotate = () => {
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
        
        setImageHistory(prev => [...prev, imageUrl]);
        setImageUrl(canvas.toDataURL("image/png"));
        toast.success("Image rotated!");
      }
    };
    
    img.src = imageUrl;
  };

  const handleEdit = async () => {
    if (!editPrompt.trim()) {
      toast.error("Please enter an edit instruction");
      return;
    }

    setIsEditing(true);
    
    // Scroll to top to show loading animation
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
    
    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl,
          prompt: editPrompt,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to edit image');
      }

      if (!data?.imageUrl) {
        throw new Error('No image URL returned');
      }
      
      // Update the image with the edited version
      setImageHistory(prev => [...prev, imageUrl]);
      setImageUrl(data.imageUrl);
      setIsEditing(false);
      toast.success("Edit applied successfully!");
      setEditPrompt("");
    } catch (error) {
      console.error('Edit error:', error);
      setIsEditing(false);
      toast.error(error instanceof Error ? error.message : 'Failed to apply edit');
    }
  };

  const handleSave = async () => {
    if (!imageUrl || isSaving) return;
    
    if (!user) {
      toast.error("Please sign in to save pawtraits");
      navigate("/auth");
      return;
    }
    
    setIsSaving(true);
    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageUrl);
      const blob = await base64Response.blob();
      
      // Generate unique filename
      const filename = `pawtrait-${Date.now()}.png`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pawtraits')
        .upload(filename, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pawtraits')
        .getPublicUrl(filename);

      // Save to database
      const { error: dbError } = await supabase
        .from('pawtraits')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          filter_name: filterName,
          description: "",
        });

      if (dbError) throw dbError;

      toast.success("Saved to your gallery!");
      navigate("/gallery");
    } catch (error) {
      console.error('Save error:', error);
      const message = error instanceof Error ? error.message : "Failed to save pawtrait";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = () => {
    if (imageHistory.length === 0) return;
    
    const previousImage = imageHistory[imageHistory.length - 1];
    setImageHistory(prev => prev.slice(0, -1));
    setImageUrl(previousImage);
    toast.success("Undone!");
  };

  const handleShare = async () => {
    if (navigator.share && imageUrl) {
      try {
        // Convert base64 to blob for sharing
        const base64Response = await fetch(imageUrl);
        const blob = await base64Response.blob();
        const file = new File([blob], `pawtrait-${filterName}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: "My Pawtrait",
          text: `Check out my pet's ${filterName} style portrait!`,
          files: [file],
        });
        toast.success("Shared successfully!");
      } catch (err) {
        console.error("Share failed:", err);
        if ((err as Error).name !== 'AbortError') {
          toast.error("Share failed");
        }
      }
    } else {
      toast.info("Share feature not available on this device");
    }
  };

  if (!imageUrl) return null;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border z-10 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/filters")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Your Pawtrait</h1>
            <p className="text-sm text-muted-foreground">{filterName} style</p>
          </div>
          <Button
            onClick={handleSave}
            size="sm"
            className="bg-gradient-primary hover:opacity-90 rounded-full px-4"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </header>

      {/* Image Preview */}
      <div className="px-6 py-6">
        <div className="relative rounded-3xl overflow-hidden shadow-primary">
          <img
            src={imageUrl}
            alt="Edited pet"
            className="w-full aspect-square object-cover"
          />
          {isEditing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <EnhancedPawLoader 
                message="Applying your edits..." 
                previewImage={imageUrl}
                estimatedDuration={25}
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit Section */}
      <div className="px-6 space-y-4">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Refine Your Pawtrait</h2>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCropDialog(true)}
              className="flex items-center gap-2"
            >
              <Crop className="h-4 w-4" />
              Crop
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="flex items-center gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Rotate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={imageHistory.length === 0}
              className="flex items-center gap-2"
            >
              <Undo className="h-4 w-4" />
              Undo
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Use a simple prompt to edit your image
          </p>
          
          <div className="flex gap-2">
            <Input
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g., 'remove the couch from background'"
              className="flex-1 rounded-xl border-2 focus:border-primary"
              disabled={isEditing}
            />
            <Button
              onClick={handleEdit}
              disabled={isEditing || !editPrompt.trim()}
              className="bg-gradient-accent hover:opacity-90 rounded-xl px-6"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              "Remove background",
              "Make background blue",
              "Add sunglasses",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setEditPrompt(suggestion)}
                disabled={isEditing}
                className="px-3 py-1 text-xs rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleShare}
            size="lg"
            variant="secondary"
            className="flex-1 h-14 bg-gradient-secondary hover:opacity-90 rounded-2xl"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="flex-1 h-14 bg-gradient-primary hover:opacity-90 rounded-2xl disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? "Saving..." : "Save to Gallery"}
          </Button>
        </div>
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
              rotation={rotation}
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
            <label className="text-sm font-medium">Rotate:</label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
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

export default Edit;

