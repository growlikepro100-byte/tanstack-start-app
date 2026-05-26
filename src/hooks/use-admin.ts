import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentUserId() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUid(s?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

export function useIsAdmin() {
  const uid = useCurrentUserId();
  const { data } = useQuery({
    queryKey: ["is-admin", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid!)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
  return { isAdmin: !!data, userId: uid };
}
