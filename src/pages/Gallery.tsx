import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Share2, Edit3, Plus, X, LogOut, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import watermarkLogo from "@/assets/watermark-logo.png";

interface Pawtrait {
  id: string;
  image_url: string;
  original_image_url?: string | null;
  filter_name: string;
  description: string;
  created_at: string;
}

const Gallery = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [pawtraits, setPawtraits] = useState<Pawtrait[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState<"edited" | "compare">("edited");
  const [comparePosition, setComparePosition] = useState(50);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else {
        loadPawtraits();
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setPreviewMode("edited");
    setComparePosition(50);
  }, [selectedId]);

  const loadPawtraits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("pawtraits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPawtraits(data || []);
    } catch (error) {
      console.error("Error fetching pawtraits:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    try {
      const filename = imageUrl.split("/").pop();

      if (filename) {
        await supabase.storage.from("pawtraits").remove([filename]);
      }

      const { error } = await supabase.from("pawtraits").delete().eq("id", id);

      if (error) throw error;

      setPawtraits(pawtraits.filter((p) => p.id !== id));
      setDeleteId(null);
      setSelectedId(null);
      toast.success("Pawtrait deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete pawtrait");
    }
  };

  const handleSaveDescription = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pawtraits")
        .update({ description: editDescription })
        .eq("id", id);

      if (error) throw error;

      setPawtraits(
        pawtraits.map((p) =>
          p.id === id ? { ...p, description: editDescription } : p
        )
      );
      setEditingId(null);
      toast.success("Description updated");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update description");
    }
  };

  const handleShare = async (pawtrait: Pawtrait) => {
    if (navigator.share) {
      try {
        const response = await fetch(pawtrait.image_url);
        const blob = await response.blob();
        const file = new File([blob], `pawtrait-${pawtrait.filter_name}.png`, {
          type: "image/png",
        });

        await navigator.share({
          title: "My Pawtrait",
          text:
            pawtrait.description ||
            `Check out my pet's ${pawtrait.filter_name} style portrait!`,
          files: [file],
        });
      } catch (error) {
        console.error("Share failed:", error);
        if ((error as Error).name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    } else {
      toast.info("Share feature not available on this device");
    }
  };

  const selected = selectedId ? pawtraits.find((p) => p.id === selectedId) : null;
  const originalForCompare = selected?.original_image_url || "";
  const hasTrueOriginal = Boolean(selected?.original_image_url);

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 relative">
      <div className="fixed inset-0 flex items-start justify-center pointer-events-none z-0">
        <img src={watermarkLogo} alt="" className="w-full max-w-xs opacity-[0.18]" />
      </div>

      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border z-10 px-6 py-4 relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Pawtraits</h1>
            <p className="text-sm text-muted-foreground">
              {pawtraits.length} {pawtraits.length === 1 ? "portrait" : "portraits"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/")}
              size="sm"
              className="bg-gradient-primary hover:opacity-90 rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button
              onClick={signOut}
              size="sm"
              variant="ghost"
              className="rounded-full"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 relative z-10">
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      ) : pawtraits.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center relative z-10">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Pawtraits Yet</h2>
          <p className="text-muted-foreground mb-6">Start creating amazing pet art!</p>
          <Button onClick={() => navigate("/")} className="bg-gradient-primary hover:opacity-90">
            Create Your First Pawtrait
          </Button>
        </div>
      ) : (
        <div className="px-6 py-6 grid grid-cols-2 gap-4 relative z-10">
          {pawtraits.map((pawtrait, index) => (
            <button
              key={pawtrait.id}
              onClick={() => setSelectedId(pawtrait.id)}
              className="group relative rounded-2xl overflow-hidden shadow-soft hover:shadow-primary transition-all duration-300 hover:scale-[1.02] animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <img
                src={pawtrait.image_url}
                alt={`Pawtrait ${index + 1}`}
                className="w-full aspect-square object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-left">
                <p className="text-xs font-semibold">{pawtrait.filter_name}</p>
                <p className="text-xs opacity-80 truncate">{pawtrait.description || "No description"}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <AlertDialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
          <AlertDialogContent className="max-w-lg rounded-3xl">
            <AlertDialogHeader className="relative">
              <button
                onClick={() => setSelectedId(null)}
                className="absolute right-0 top-0 rounded-full p-2 hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <AlertDialogTitle>{selected.filter_name} Style</AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={previewMode === "edited" ? "default" : "outline"}
                  onClick={() => setPreviewMode("edited")}
                  className="rounded-full"
                >
                  Edited
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === "compare" ? "default" : "outline"}
                  onClick={() => setPreviewMode("compare")}
                  className="rounded-full"
                  disabled={!hasTrueOriginal}
                  title={!hasTrueOriginal ? "Original image not available for this item" : undefined}
                >
                  Compare
                </Button>
              </div>
              

              {previewMode === "edited" ? (
                <img
                  src={selected.image_url}
                  alt="Selected pawtrait"
                  className="w-full max-h-[50vh] object-contain rounded-2xl"
                />
              ) : (
                <div className="space-y-2">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-border bg-muted">
                    <img
                      src={originalForCompare}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <img
                      src={selected.image_url}
                      alt="Edited"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-md"
                      style={{ left: `${comparePosition}%` }}
                    />
                    <span className="absolute left-2 top-2 text-[10px] px-2 py-1 rounded-full bg-black/60 text-white">Edited</span>
                    <span className="absolute right-2 top-2 text-[10px] px-2 py-1 rounded-full bg-black/60 text-white">Original</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={comparePosition}
                      onChange={(e) => setComparePosition(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  </div>
              )}

              {editingId === selected.id ? (
                <div className="space-y-2">
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveDescription(selected.id)}
                      size="sm"
                      className="flex-1 rounded-xl"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-muted-foreground">
                    {selected.description || "No description"}
                  </p>
                  <Button
                    onClick={() => {
                      setEditingId(selected.id);
                      setEditDescription(selected.description);
                    }}
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handleShare(selected)}
                variant="secondary"
                className="flex-1 rounded-xl bg-gradient-secondary hover:opacity-90"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={() => {
                  setDeleteId(selected.id);
                }}
                variant="destructive"
                className="flex-1 rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <AlertDialogCancel className="flex-1 rounded-xl">Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pawtrait?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this pawtrait from your gallery. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  const pawtrait = pawtraits.find((p) => p.id === deleteId);
                  if (pawtrait) {
                    handleDelete(deleteId, pawtrait.image_url);
                  }
                }
              }}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Gallery;


