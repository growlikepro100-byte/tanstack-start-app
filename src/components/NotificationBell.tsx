import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUserId } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { toBanglaNumber } from "@/lib/format";

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const uid = useCurrentUserId();
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", uid],
    enabled: !!uid,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, read, created_at")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Notification[];
    },
  });

  if (!uid) return null;

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["notifications", uid] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card hover:bg-accent/40">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {toBanglaNumber(unread)}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-semibold">নোটিফিকেশন</span>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="h-7 text-xs">
              <Check className="mr-1 h-3 w-3" /> সব পঠিত
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              কোন নোটিফিকেশন নেই
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`border-b border-border/60 px-3 py-2.5 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="mt-0.5 text-xs text-foreground/80 whitespace-pre-wrap">
                      {n.message}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("bn-BD")}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
