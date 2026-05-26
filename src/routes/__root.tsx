import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">৪০৪</h1>
        <h2 className="mt-4 text-xl font-semibold">পেজ খুঁজে পাওয়া যায়নি</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          যে পেজটি খুঁজছেন সেটি আর নেই অথবা সরিয়ে ফেলা হয়েছে।
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          হোমে ফিরে যান
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">কিছু একটা ভুল হয়েছে</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          পেজটি লোড করা যায়নি। আবার চেষ্টা করুন।
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            আবার চেষ্টা করুন
          </button>
          <a
            href="/"
            className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium"
          >
            হোমে যান
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1f3d2e" },
      { title: "গরু কিনবো — বিশ্বস্ত কোরবানি পশুর হাট" },
      {
        name: "description",
        content:
          "বাংলাদেশের প্রিমিয়াম অনলাইন গরুর হাট। সরাসরি খামারি ও বিক্রেতা থেকে কোরবানির গরু কিনুন।",
      },
      { property: "og:title", content: "গরু কিনবো — বিশ্বস্ত কোরবানি পশুর হাট" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "গরু কিনবো — বিশ্বস্ত কোরবানি পশুর হাট" },
      { name: "description", content: "Qurbani Connect is a mobile-first web app for buying and selling Qurbani livestock." },
      { property: "og:description", content: "Qurbani Connect is a mobile-first web app for buying and selling Qurbani livestock." },
      { name: "twitter:description", content: "Qurbani Connect is a mobile-first web app for buying and selling Qurbani livestock." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4ae0597a-df25-4be0-a039-eb1cf1c8ed78/id-preview-88691298--d6fc8dca-39e9-4825-a61d-6bb73e9eeba7.lovable.app-1779728925558.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4ae0597a-df25-4be0-a039-eb1cf1c8ed78/id-preview-88691298--d6fc8dca-39e9-4825-a61d-6bb73e9eeba7.lovable.app-1779728925558.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
