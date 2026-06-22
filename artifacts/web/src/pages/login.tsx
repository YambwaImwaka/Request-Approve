import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const loginMutation = useLogin();

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.token);
          setLocation("/dashboard");
        },
        onError: (err) => {
          toast({
            title: "Login failed",
            description: err.message || "Invalid credentials. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const setDemoCredentials = (role: "APPLICANT" | "REVIEWER") => {
    setEmail(`${role.toLowerCase()}@example.com`);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">Beneficial Ownership</h1>
          <p className="text-muted-foreground text-center mt-1">Institutional Change Request Portal</p>
        </div>
        
        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 bg-muted/50 p-6 rounded-b-xl border-t border-border mt-2">
            <div className="text-sm font-medium text-center text-muted-foreground w-full">Demo Accounts</div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <Button variant="outline" size="sm" onClick={() => setDemoCredentials("APPLICANT")} className="text-xs">
                Applicant Demo
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDemoCredentials("REVIEWER")} className="text-xs">
                Reviewer Demo
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
