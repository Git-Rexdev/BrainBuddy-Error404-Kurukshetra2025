"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type DoubtResponse = {
  extracted_text: string;
  answer: string;
  file?: { filename: string; path: string };
};

export default function DoubtPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DoubtResponse | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);

    if (!file) {
      setError("Please select an image of the question.");
      return;
    }

    try {
      setLoading(true);
      const token = Cookies.get("bb_token") || "";
      const fd = new FormData();
      fd.append("image", file); // <-- backend expects field name 'image'

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/doubt/solve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // or pass ?access_token= token
          // DO NOT set Content-Type when sending FormData
        },
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed (${res.status})`);
      }
      const json: DoubtResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl pt-8 grid gap-6 md:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Ask a Doubt (Image)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="image" className="text-sm font-medium">Upload question image</label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Supported: JPG, PNG, etc. The server will OCR and solve it.
              </p>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Solving…" : "Upload & Solve"}
            </Button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data && !loading && <p className="text-sm text-muted-foreground">No result yet.</p>}
          {loading && <p className="text-sm text-muted-foreground">Working…</p>}

          {data && (
            <>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Extracted Text</div>
                <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap">
                  {data.extracted_text || "—"}
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Answer</div>
                <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap">
                  {data.answer || "—"}
                </div>
              </div>

              {data.file?.filename && (
                <p className="text-xs text-muted-foreground">
                  Saved as: <span className="font-mono">{data.file.filename}</span>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
