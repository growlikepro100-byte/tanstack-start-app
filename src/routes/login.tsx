import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "লগ ইন — গরু কিনবো" },
      { name: "description", content: "Google দিয়ে এক ক্লিকে সাইন ইন করুন।" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/dashboard" });
    });
  }, [router]);

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("লগ ইন ব্যর্থ", { description: result.error.message });
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/dashboard" });
  };

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div className="bg-gradient-hero p-8 text-center text-primary-foreground">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-3xl shadow-gold">
            🐄
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">স্বাগতম</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            গরু কিনবো-তে সাইন ইন করুন
          </p>
        </div>

        <div className="p-8">
          <Button
            onClick={handleGoogle}
            disabled={loading}
            className="h-12 w-full bg-foreground text-background hover:opacity-90"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#FFC107"
                d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 0 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A19.9 19.9 0 0 0 24 4a20 20 0 1 0 19.6 16.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A19.9 19.9 0 0 0 24 4 19.9 19.9 0 0 0 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"
              />
            </svg>
            {loading ? "অপেক্ষা করুন..." : "Google দিয়ে সাইন ইন"}
          </Button>

          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Google যাচাইকরণে স্বয়ংক্রিয় Verified Badge</span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>কোনো ম্যানুয়াল অ্যাডমিন ভেরিফিকেশন নেই — সরাসরি বিক্রি শুরু করুন</span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            লগ ইন করে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন।
          </p>
          <p className="mt-4 text-center text-xs">
            <Link to="/" className="text-primary hover:underline">
              ← হোমে ফিরে যান
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
