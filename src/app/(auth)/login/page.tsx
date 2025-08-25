"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

const LoginSchema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (values: z.infer<typeof LoginSchema>) => {
    setErr(null);

    const body = new URLSearchParams();
    body.set("username", values.username);
    body.set("password", values.password);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Login failed");
      }

      const data: { access_token: string; token_type: string } = await res.json();

      // Set cookie for SSR layout; secure for HTTPS, readable on all routes.
      Cookies.set("bb_token", data.access_token, {
        sameSite: "lax",
        secure: true,
        path: "/",
      });

      // Navigate and force server components (layout) to re-evaluate cookies.
      router.replace("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    }
  };

  return (
    <div className="mx-auto max-w-md pt-16">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" autoComplete="username" {...register("username")} />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {err && <p className="text-sm text-red-500 whitespace-pre-wrap">{err}</p>}

            <Button className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
