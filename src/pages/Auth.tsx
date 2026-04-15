import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { authSchema } from "@/lib/validation";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input using Zod schema
    const result = authSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      toast.error("Invalid email or password");
    } else {
      toast.success("Logged in successfully!");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input using Zod schema
    const result = authSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      fullName: signupFullName,
      phoneNumber: signupPhone || undefined,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: result.data.fullName,
        }
      }
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please login instead.");
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } else {
      toast.success("Account created successfully!");
      
      // Update profile with phone number if provided
      if (result.data.phoneNumber) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            phone_number: result.data.phoneNumber
          }).eq('id', user.id);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-4 rounded-full">
              <Shield className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Emergency Response PH</h1>
          <p className="text-muted-foreground">
            Sign in or create an account to access emergency services
          </p>
        </div>

        {/* Auth Tabs */}
        <div className="bg-card rounded-lg shadow-lg p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+63 912 345 6789"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    At least 6 characters
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Info Banner */}
        <div className="mt-6 bg-accent/10 border border-accent/20 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Quick Access</p>
            <p>Create an account to save your emergency history and personal contacts for faster emergency response.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
