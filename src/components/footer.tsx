"use client";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Made by <span className="font-medium text-foreground">Team Error 404</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} All Rights Reserved
          </div>
        </div>
      </div>
    </footer>
  );
}
