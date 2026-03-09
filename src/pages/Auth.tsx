import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Chrome, Loader2 } from "lucide-react";
import { getUserFriendlyErrorMessage, runApi } from "@/lib/api";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await runApi(async () => {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw error;
          }
        }, {
          operation: "Sign in",
          timeoutMs: 20_000,
          retries: 1,
        });

        toast.success("Welcome back!");
        navigate("/");
      } else {
        await runApi(async () => {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

          if (error) {
            throw error;
          }
        }, {
          operation: "Sign up",
          timeoutMs: 20_000,
          retries: 1,
        });

        toast.success("Account created! You can now log in.");
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);

    try {
      await runApi(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          throw error;
        }
      }, {
        operation: "Sign in with Google",
        timeoutMs: 20_000,
      });
    } catch (error) {
      toast.error(getUserFriendlyErrorMessage(error));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? "Sign in to access your Pawtraits"
              : "Sign up to start creating Pawtraits"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Google...
              </>
            ) : (
              <>
                <Chrome className="mr-2 h-4 w-4" />
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || googleLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || googleLoading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>{isLogin ? "Sign In" : "Sign Up"}</>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
              disabled={loading || googleLoading}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
