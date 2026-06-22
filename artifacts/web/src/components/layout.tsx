import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-semibold tracking-tight hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
              B
            </div>
            <span>Beneficial Ownership</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant={location === "/dashboard" ? "secondary" : "ghost"} size="sm" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-none">{user.email}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{user.role}</div>
            </div>
            <Avatar className="w-8 h-8 border border-border">
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                {user.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Log out">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
