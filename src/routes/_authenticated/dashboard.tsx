import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Plus, Pencil, Trash2, Inbox, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: myListings = [], refetch } = useQuery({
    enabled: !!userId,
    queryKey: ["my-listings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, age_months, weight_kg, location, featured, status, listing_media(url, sort_order)",
        )
        .eq("seller_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("id, buyer_name, buyer_phone, message, created_at, listings(title)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const deleteListing = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("মুছে ফেলা হয়েছে");
      refetch();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">ড্যাশবোর্ড</h1>
          <p className="text-muted-foreground">আপনার বিজ্ঞাপন ও বুকিং রিকোয়েস্ট</p>
        </div>
        <div className="flex gap-2">
          <Link to="/farm/setup">
            <Button variant="outline">
              <BadgeCheck className="mr-2 h-4 w-4" /> খামার সেটআপ
            </Button>
          </Link>
          <Link to="/listings/new">
            <Button className="bg-gradient-gold text-gold-foreground shadow-gold">
              <Plus className="mr-2 h-4 w-4" /> নতুন বিজ্ঞাপন
            </Button>
          </Link>
        </div>
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-bold">আমার গরু সমূহ</h2>
        {myListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-lg font-semibold">এখনো কোনো বিজ্ঞাপন নেই</p>
            <Link to="/listings/new">
              <Button className="mt-4 bg-gradient-primary">প্রথম বিজ্ঞাপন দিন</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {myListings.map((l) => {
              const card: ListingCardData = {
                id: l.id,
                title: l.title,
                price: Number(l.price),
                age_months: l.age_months,
                weight_kg: l.weight_kg,
                location: l.location,
                featured: l.featured,
                cover_url:
                  l.listing_media?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
              };
              return (
                <div key={l.id} className="relative">
                  <ListingCard data={card} />
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => deleteListing(l.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> মুছুন
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <Inbox className="h-5 w-5" /> বুকিং রিকোয়েস্ট
        </h2>
        {bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            এখনো কোনো রিকোয়েস্ট নেই
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-4 py-3">গরু</th>
                  <th className="px-4 py-3">ক্রেতা</th>
                  <th className="px-4 py-3">ফোন</th>
                  <th className="px-4 py-3 hidden md:table-cell">মেসেজ</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      {(b.listings as { title: string } | null)?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{b.buyer_name}</td>
                    <td className="px-4 py-3">
                      <a href={`tel:${b.buyer_phone}`} className="text-primary hover:underline">
                        {b.buyer_phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {b.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
