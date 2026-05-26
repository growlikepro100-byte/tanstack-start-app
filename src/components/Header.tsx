import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Plus, User, LogOut, Heart, LayoutDashboard, Shield } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

export function Header() {
  const router = useRouter();
  const { isAdmin } = useIsAdmin();
  const [user, setUser] = useState<{ id: string; email?: string; avatar?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u)
        setUser({
          id: u.id,
          email: u.email ?? undefined,
          avatar: (u.user_metadata as { avatar_url?: string })?.avatar_url,
        });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(
        u
          ? {
              id: u.id,
              email: u.email ?? undefined,
              avatar: (u.user_metadata as { avatar_url?: string })?.avatar_url,
            }
          : null,
      );
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="গরু কিনবো" className="h-11 w-11 object-contain" />
          <span className="font-display text-xl font-bold tracking-tight">
            গরু <span className="text-primary">কিনবো</span>
          </span>
        </Link>


        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary"
            activeProps={{ className: "px-3 py-2 text-sm font-semibold text-primary" }}
            activeOptions={{ exact: true }}
          >
            হোম
          </Link>
          <Link
            to="/browse"
            className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary"
            activeProps={{ className: "px-3 py-2 text-sm font-semibold text-primary" }}
          >
            গরু খুঁজুন
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/listings/new" className="hidden sm:inline-flex">
                <Button className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold">
                  <Plus className="mr-1 h-4 w-4" /> বিজ্ঞাপন দিন
                </Button>
              </Link>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <Shield className="mr-2 h-4 w-4 text-gold" /> এডমিন প্যানেল
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> ড্যাশবোর্ড
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites">
                      <Heart className="mr-2 h-4 w-4" /> পছন্দের তালিকা
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" /> প্রোফাইল
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> লগ আউট
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/login">
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-95">
                লগ ইন
              </Button>
            </Link>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-3">
                <Link to="/" className="rounded-lg px-3 py-2 text-base font-medium hover:bg-muted">
                  হোম
                </Link>
                <Link to="/browse" className="rounded-lg px-3 py-2 text-base font-medium hover:bg-muted">
                  গরু খুঁজুন
                </Link>
                {user && (
                  <>
                    <Link to="/dashboard" className="rounded-lg px-3 py-2 text-base font-medium hover:bg-muted">
                      ড্যাশবোর্ড
                    </Link>
                    <Link to="/listings/new" className="rounded-lg px-3 py-2 text-base font-medium hover:bg-muted">
                      বিজ্ঞাপন দিন
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
