"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Me = { username?: string; full_name?: string; email?: string };

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get("bb_token") || "";
    api<Me>("/api/auth/me", {}, token).then(setMe).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="pt-10 grid gap-6">
      <Card>
        <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
        <CardContent>
          {err && <p className="text-red-500">{err}</p>}
          {me ? (
            <ul className="space-y-1">
              <li><b>Username:</b> {me.username}</li>
              <li><b>Name:</b> {me.full_name}</li>
              <li><b>Email:</b> {me.email}</li>
            </ul>
          ) : (
            <p>Loading...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
