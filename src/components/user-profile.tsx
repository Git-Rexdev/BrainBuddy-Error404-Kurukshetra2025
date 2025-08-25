"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type UserProfileProps = {
  user?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
  loading?: boolean;
  showLogout?: boolean;
  showSettings?: boolean;
  onLogout?: () => void;
  onSettings?: () => void;
  variant?: "default" | "compact" | "minimal";
  className?: string;
};

export default function UserProfile({
  user,
  loading = false,
  showLogout = false,
  showSettings = false,
  onLogout,
  onSettings,
  variant = "default",
  className,
}: UserProfileProps) {
  // Generate initials from full name
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (variant === "minimal") {
    return (
      <Avatar className={cn("h-8 w-8", className)} title={user?.full_name || "User"}>
        <AvatarImage 
          src={user?.avatar_url} 
          alt={user?.full_name || "User"}
        />
        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary font-semibold text-xs">
          {loading ? (
            <User className="h-3 w-3 animate-pulse" />
          ) : (
            getInitials(user?.full_name)
          )}
        </AvatarFallback>
      </Avatar>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Avatar className="h-6 w-6">
          <AvatarImage 
            src={user?.avatar_url} 
            alt={user?.full_name || "User"}
          />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {loading ? (
              <User className="h-3 w-3 animate-pulse" />
            ) : (
              getInitials(user?.full_name)
            )}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground">
          {user?.full_name || "User"}
        </span>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
        <AvatarImage 
          src={user?.avatar_url} 
          alt={user?.full_name || "User"}
        />
        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary font-semibold text-sm">
          {loading ? (
            <User className="h-4 w-4 animate-pulse" />
          ) : (
            getInitials(user?.full_name)
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
          </div>
        ) : (
          <>
            <div className="truncate font-semibold text-foreground">
              {user?.full_name || "Guest User"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.email || "No email available"}
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {showSettings && onSettings && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 hover:bg-muted" 
            onClick={onSettings}
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        
        {showLogout && onLogout && (
          <Button 
            size="sm" 
            variant="outline" 
            className="hover:bg-destructive hover:text-destructive-foreground transition-colors" 
            onClick={onLogout}
            aria-label="Logout"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}
