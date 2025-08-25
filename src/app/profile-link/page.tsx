// src/app/profile-link/page.tsx
"use client";
import { useEffect, useState } from "react";
import ProfileLinkModal from "@/components/profile-link-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Cookies from "js-cookie";
import { getLinkedClassStd } from "@/lib/profile"; // ← helper we added

export default function ProfileLinkPage() {
  const [open, setOpen] = useState(true);
  const [classStd, setClassStd] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const readLocal = () => {
    try {
      const c = window.localStorage.getItem("bb_class_std");
      const e = window.localStorage.getItem("bb_profile_email");
      setClassStd(c && /^\d+$/.test(c) ? parseInt(c, 10) : null);
      setEmail(e || null);
    } catch {
      setClassStd(null);
      setEmail(null);
    }
  };

  const syncFromServer = async () => {
    setSyncing(true);
    try {
      const token = Cookies.get("bb_token");
      if (!token) { readLocal(); return; }
      const { classStd } = await getLinkedClassStd({ bypassCache: true });
      if (typeof classStd === "number") {
        window.localStorage.setItem("bb_class_std", String(classStd));
      }
      readLocal();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { readLocal(); }, []);

  return (
    <div className="mx-auto max-w-2xl pt-6 space-y-4 px-3 sm:px-4">
      <Card>
        <CardHeader>
          <CardTitle>Link your student profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-muted-foreground">Provide your details to personalize your AI tutor.</p>

          <div className="mt-4 rounded-lg border p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-xs text-muted-foreground">Detected:</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Class: {classStd ?? "—"}</Badge>
              {email && <Badge variant="outline" className="hidden sm:inline">Email: {email}</Badge>}
            </div>
            <div className="ml-auto flex gap-2 w-full sm:w-auto">
              <Button size="sm" variant="outline" onClick={readLocal} className="flex-1 sm:flex-none">Refresh</Button>
              <Button size="sm" onClick={syncFromServer} disabled={syncing} className="flex-1 sm:flex-none">
                {syncing ? "Syncing…" : "Sync from server"}
              </Button>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Saving updates both your device and the database. "Sync from server" re-reads the DB.
          </p>
        </CardContent>
      </Card>

      <ProfileLinkModal
        open={open}
        onOpenChange={setOpen}
        onLinked={({ email, class_std }) => {
          window.localStorage.setItem("bb_class_std", String(class_std));
          window.localStorage.setItem("bb_profile_email", email);
          setClassStd(class_std);
          setEmail(email);
        }}
      />
    </div>
  );
}
