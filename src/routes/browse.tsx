import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { formatPriceBn } from "@/lib/format";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "গরু খুঁজুন — গরু কিনবো" },
      { name: "description", content: "ফিল্টার ও সার্চ দিয়ে আপনার পছন্দের কোরবানির গরু খুঁজুন।" },
    ],
  }),
  component: Browse,
});

type ListingRow = {
  id: string;
  title: string;
  price: number;
  age_months: number | null;
  weight_kg: number | null;
  location: string | null;
  featured: boolean;
  pinned: boolean;
  listing_media: { url: string; sort_order: number }[] | null;
};

function Browse() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [minWeight, setMinWeight] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", "browse"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, age_months, weight_kg, location, featured, pinned, listing_media(url, sort_order)",
        )
        .eq("status", "active")
        .order("pinned", { ascending: false })
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as ListingRow[];
    },
  });

  const filtered = useMemo<ListingCardData[]>(() => {
    return listings
      .filter((l) => {
        if (q && !l.title.toLowerCase().includes(q.toLowerCase())) return false;
        if (location && !(l.location ?? "").toLowerCase().includes(location.toLowerCase()))
          return false;
        const p = Number(l.price);
        if (p < priceRange[0] || p > priceRange[1]) return false;
        if (minWeight && (l.weight_kg ?? 0) < Number(minWeight)) return false;
        return true;
      })
      .map((l) => ({
        id: l.id,
        title: l.title,
        price: Number(l.price),
        age_months: l.age_months,
        weight_kg: l.weight_kg,
        location: l.location,
        featured: l.featured,
        cover_url:
          l.listing_media?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
      }));
  }, [listings, q, location, priceRange, minWeight]);

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">এলাকা</label>
        <Input
          placeholder="যেমন: ঢাকা, কুষ্টিয়া"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">
          দামের পরিসীমা: {formatPriceBn(priceRange[0])} — {formatPriceBn(priceRange[1])}
        </label>
        <Slider
          min={0}
          max={1000000}
          step={5000}
          value={priceRange}
          onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">সর্বনিম্ন ওজন (কেজি)</label>
        <Input
          type="number"
          placeholder="যেমন: 200"
          value={minWeight}
          onChange={(e) => setMinWeight(e.target.value)}
        />
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setLocation("");
          setPriceRange([0, 1000000]);
          setMinWeight("");
          setQ("");
        }}
      >
        <X className="mr-2 h-4 w-4" /> সব ফিল্টার মুছুন
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Sticky search bar */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:rounded-2xl md:border md:shadow-card md:relative md:top-0 md:mx-0 md:bg-card">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="গরু খুঁজুন..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-11 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>ফিল্টার</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{FilterPanel}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 font-display text-lg font-bold">ফিল্টার</h3>
            {FilterPanel}
          </div>
        </aside>

        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            {isLoading ? "লোড হচ্ছে..." : `${filtered.length}টি গরু পাওয়া গেছে`}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <div className="text-5xl">🔍</div>
              <p className="mt-3 text-lg font-semibold">কোনো গরু পাওয়া যায়নি</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l) => (
                <ListingCard key={l.id} data={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
