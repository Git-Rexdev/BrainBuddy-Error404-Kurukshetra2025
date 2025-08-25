import SiteLogo from "@/components/site-logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center gap-6">
      <SiteLogo size={56} />
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Personalized AI Tutor</h1>
      <p className="max-w-xl text-muted-foreground">
        Create adaptive learning plans and assessments — tailored to every student.
      </p>
      <div className="flex gap-3">
        <Button asChild><Link href="/login">Get started</Link></Button>
        <Button variant="outline" asChild><Link href="/register">Create account</Link></Button>
      </div>
    </section>
  );
}
