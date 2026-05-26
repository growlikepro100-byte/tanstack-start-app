import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: Favorites,
});

function Favorites() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: favorites = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["favorites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("listings(id, title, price, age_months, weight_kg, location, featured, listing_media(url, sort_order))")
        .eq("user_id", userId!);
      if (error) throw error;
      return data
        .map((row) => row.listings as unknown as {
          id: string;
          title: string;
          price: number;
          age_months: number | null;
          weight_kg: number | null;
          location: string | null;
          featured: boolean;
          listing_media: { url: string; sort_order: number }[];
        })
        .filter(Boolean)
        .map<ListingCardData>((l) => ({
          id: l.id,
          title: l.title,
          price: Number(l.price),
          age_months: l.age_months,
          weight_kg: l.weight_kg,
          location: l.location,
          featured: l.featured,
          cover_url: l.listing_media?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
        }));
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">পছন্দের তালিকা</h1>
      {favorites.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          এখনো কোনো প্রিয় গরু নেই
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((l) => (
            <ListingCard key={l.id} data={l} />
          ))}
        </div>
      )}
    </div>
  );
}
