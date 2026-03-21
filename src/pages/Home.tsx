import { Camera, Upload, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-pets.jpg";
import watermarkLogo from "@/assets/watermark-logo.png";
import { optimizeUploadedImage } from "@/lib/image";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, could show a different UI or just continue
    }
  }, [user, loading]);

  const handleCameraClick = () => {
    // In a real app with Capacitor, this would open the device camera
    // For now, we'll use file input with camera preference
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const file = event.target.files?.[0];
    if (file) {
      try {
        const imageUrl = await optimizeUploadedImage(file);
        navigate("/filters", { state: { imageUrl, fileName: file.name } });
      } catch (error) {
        console.error("Image preparation error:", error);
        toast.error("We couldn't prepare that photo. Please try another image.");
      } finally {
        event.target.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 relative">
      {/* Watermark Logo */}
      <div className="fixed inset-0 flex items-start justify-center pointer-events-none z-0">
        <img 
          src={watermarkLogo} 
          alt="" 
          className="w-full max-w-xs opacity-[0.18]"
        />
      </div>
      
      {/* Header with Logo */}
      <header className="pt-8 pb-4 px-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1" />
          {!user && !loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>
        <div className="flex flex-col items-center gap-3 animate-slide-up">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Pawtrait
          </h1>
          <p className="text-muted-foreground text-center">
            Transform your pet photos into artistic masterpieces
          </p>
        </div>
      </header>

      {/* Hero Image */}
      <div className="px-6 py-8 relative z-10">
        <div className="relative rounded-3xl overflow-hidden shadow-soft animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <img 
            src={heroImage} 
            alt="Happy pets" 
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="px-6 space-y-4 relative z-10">
        <Button
          onClick={handleCameraClick}
          size="lg"
          className="w-full h-20 text-lg font-semibold bg-gradient-primary hover:opacity-90 shadow-primary transition-all duration-300 hover:scale-[1.02] animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <Camera className="w-6 h-6 mr-3" />
          Open Camera
        </Button>

        <Button
          onClick={handleUploadClick}
          size="lg"
          variant="secondary"
          className="w-full h-20 text-lg font-semibold bg-gradient-secondary hover:opacity-90 shadow-secondary transition-all duration-300 hover:scale-[1.02] animate-slide-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Upload className="w-6 h-6 mr-3" />
          Choose Photo
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Features List */}
      <div className="px-6 pt-12 pb-8 space-y-3 animate-slide-up" style={{ animationDelay: "0.4s" }}>
        <h2 className="text-xl font-bold text-foreground mb-4">What you can do:</h2>
        {[
          "Apply 5 unique artistic filters",
          "Edit with simple text commands",
          "Save to your personal gallery",
          "Share your pet art with friends",
        ].map((feature, index) => (
          <div
            key={index}
            className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border/50"
          >
            <div className="w-2 h-2 rounded-full bg-gradient-primary" />
            <p className="text-sm text-foreground">{feature}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
