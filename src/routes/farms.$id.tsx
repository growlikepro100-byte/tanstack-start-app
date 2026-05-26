import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { MapPin, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/farms/$id")({
  component: FarmPage,
});

function FarmPage() {
  const { id } = Route.useParams();

  const { data: farm } = useQuery({
    queryKey: ["farm", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["farm-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, price, age_months, weight_kg, location, featured, listing_media(url, sort_order)")
        .eq("farm_id", id)
        .eq("status", "active");
      if (error) throw error;
      return data.map<ListingCardData>((l) => ({
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

  if (!farm)
    return <div className="container mx-auto p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div>
      <section className="bg-gradient-hero py-12 text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-gold">
            <BadgeCheck className="h-4 w-4" /> যাচাইকৃত খামার
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">{farm.name}</h1>
          {farm.location && (
            <p className="mt-2 inline-flex items-center gap-1 text-primary-foreground/80">
              <MapPin className="h-4 w-4" /> {farm.location}
            </p>
          )}
          {farm.description && (
            <p className="mt-4 max-w-2xl text-primary-foreground/85">{farm.description}</p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <h2 className="mb-6 font-display text-2xl font-bold">এই খামারের গরু</h2>
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            এই খামারে এখনো কোনো গরুর বিজ্ঞাপন নেই
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} data={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
