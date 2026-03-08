import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Crown, Bell, HelpCircle, Shield, Sparkles, Mail } from "lucide-react";
import { toast } from "sonner";
import watermarkLogo from "@/assets/watermark-logo.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubscribe = () => {
    // In a real app, this would integrate with in-app purchases
    toast.info("Subscription coming soon! Stay tuned for premium features.");
  };

  const handleSendFeedback = async () => {
    if (!userEmail || !message) {
      toast.error("Please fill in both email and message");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: { userEmail, message }
      });

      if (error) throw error;

      toast.success("Feedback sent successfully!");
      setContactDialogOpen(false);
      setUserEmail("");
      setMessage("");
    } catch (error: any) {
      console.error("Error sending feedback:", error);
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setIsSending(false);
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
      
      {/* Header */}
      <header className="px-6 py-8 relative z-10">
        <div className="flex flex-col items-center gap-3 animate-slide-up">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="px-6 space-y-6 relative z-10">
        {/* Subscription Card */}
        <div
          className="bg-gradient-primary rounded-3xl p-6 shadow-primary text-white animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5" />
                <h2 className="text-lg font-bold">
                  {isPremium ? "Premium Member" : "Free Plan"}
                </h2>
              </div>
              <p className="text-sm opacity-90">
                {isPremium
                  ? "Unlimited edits and no watermarks"
                  : "Limited to 5 AI edits per day"}
              </p>
            </div>
            <Sparkles className="w-8 h-8 opacity-80" />
          </div>
          {!isPremium && (
            <>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  <span>Unlimited AI edits</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  <span>No watermarks</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  <span>Early access to new filters</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  <span>Priority support</span>
                </div>
              </div>
              <Button
                onClick={handleSubscribe}
                size="lg"
                className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-semibold"
              >
                Upgrade to Premium
              </Button>
            </>
          )}
        </div>

        {/* Settings Options */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {/* Notifications */}
          <div className="bg-card rounded-2xl p-4 border border-border shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-xs text-muted-foreground">
                    Get updates about new features
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </div>

          {/* Help & Support */}
          <button
            onClick={() => toast.info("Help center coming soon!")}
            className="w-full bg-card hover:bg-card/80 rounded-2xl p-4 border border-border shadow-soft transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-secondary flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold">Help & Support</h3>
                <p className="text-xs text-muted-foreground">
                  Get help with using Pawtrait
                </p>
              </div>
            </div>
          </button>

          {/* Privacy Policy */}
          <button
            onClick={() => toast.info("Privacy policy coming soon!")}
            className="w-full bg-card hover:bg-card/80 rounded-2xl p-4 border border-border shadow-soft transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold">Privacy Policy</h3>
                <p className="text-xs text-muted-foreground">
                  How we protect your data
                </p>
              </div>
            </div>
          </button>

          {/* Contact Us */}
          <button
            onClick={() => setContactDialogOpen(true)}
            className="w-full bg-card hover:bg-card/80 rounded-2xl p-4 border border-border shadow-soft transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold">Contact Us</h3>
                <p className="text-xs text-muted-foreground">
                  Send us your feedback
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* App Info */}
        <div className="pt-8 pb-4 text-center space-y-2 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <p className="text-sm text-muted-foreground">Pawtrait v1.0.0</p>
          <p className="text-xs text-muted-foreground">
            Made with ❤️ for pet lovers
          </p>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
            <DialogDescription>
              Send us your feedback and we'll get back to you soon!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Tell us what you think..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setContactDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendFeedback}
              disabled={isSending}
              className="flex-1"
            >
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
