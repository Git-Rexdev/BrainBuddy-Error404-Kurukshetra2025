"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserProfile from "@/components/user-profile";
import EduChatWidget from "@/components/edu-chat-widget";
import { api } from "@/lib/api";

type Me = { username?: string; full_name?: string; email?: string };

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("bb_token") || "";
    setLoading(true);
    api<Me>("/api/auth/me", {}, token)
      .then(setMe)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-0 space-y-6">
      {/* Profile Section */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{err}</p>
            </div>
          )}
          
          {loading ? (
            <div className="space-y-4">
              <div className="h-16 sm:h-20 bg-muted rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </div>
          ) : me ? (
            <div className="space-y-4">
              <UserProfile 
                user={me} 
                showSettings={true}
                onSettings={() => {/* TODO: Implement settings */}}
                className="p-4 border rounded-lg bg-gradient-to-br from-muted/30 to-muted/50"
              />
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <p className="text-sm font-medium bg-background px-3 py-2 rounded-md border">{me.username || "Not set"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-sm font-medium bg-background px-3 py-2 rounded-md border">{me.full_name || "Not set"}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm font-medium bg-background px-3 py-2 rounded-md border">{me.email || "Not set"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No profile information available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Assistant Section */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            AI Learning Assistant
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Get help with your studies, ask questions, and receive personalized guidance
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <EduChatWidget mode="dashboard" />
        </CardContent>
      </Card>
    </div>
  );
}
