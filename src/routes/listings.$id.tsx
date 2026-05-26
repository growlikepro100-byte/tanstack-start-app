import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Weight,
  BadgeCheck,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatPriceBn, formatAgeBn, formatWeightBn, toBanglaNumber } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/listings/$id")({
  component: ListingDetail,
});

type ListingDetailRow = {
  id: string;
  seller_id: string;
  farm_id: string | null;
  title: string;
  description: string | null;
  breed: string | null;
  buyer_requirements: string | null;
  booking_info: string | null;
  pinned: boolean;
  price: number;
  age_months: number | null;
  weight_kg: number | null;
  location: string | null;
  featured: boolean;
  created_at: string;
  listing_media: { id: string; url: string; type: string; sort_order: number }[];
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  farms: { id: string; name: string; location: string | null; description: string | null; cover_image: string | null } | null;
};

function ListingDetail() {
  const { id } = Route.useParams();
  const [activeMedia, setActiveMedia] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, seller_id, farm_id, title, description, breed, buyer_requirements, booking_info, pinned, price, age_months, weight_kg, location, featured, created_at, listing_media(id, url, type, sort_order)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();

      const [profileRes, farmRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", data.seller_id)
          .maybeSingle(),
        data.farm_id
          ? supabase
              .from("farms")
              .select("id, name, location, description, cover_image")
              .eq("id", data.farm_id)
              .maybeSingle()
          : Promise.resolve({ data: null } as { data: null }),
      ]);

      return {
        ...data,
        profiles: profileRes.data ?? null,
        farms: farmRes.data ?? null,
      } as unknown as ListingDetailRow;
    },
  });

  // Contact info (phone/whatsapp) is only available to authenticated users
  const { data: contact } = useQuery({
    queryKey: ["listing-contact", id],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("listing_contacts")
        .select("phone, whatsapp")
        .eq("listing_id", id)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return <div className="container mx-auto p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }
  if (!listing) return null;

  const media = [...listing.listing_media].sort((a, b) => a.sort_order - b.sort_order);
  const current = media[activeMedia];
  const phone = contact?.phone ?? "";
  const whatsapp = contact?.whatsapp ?? contact?.phone ?? "";


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Gallery */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted shadow-card">
            {current ? (
              current.type === "video" ? (
                <video src={current.url} controls className="h-full w-full object-cover" />
              ) : (
                <img src={current.url} alt={listing.title} className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-8xl">🐄</div>
            )}
            {media.length > 1 && (
              <>
                <button
                  onClick={() => setActiveMedia((i) => (i - 1 + media.length) % media.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveMedia((i) => (i + 1) % media.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            {listing.featured && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold text-gold-foreground shadow-gold">
                <BadgeCheck className="h-3.5 w-3.5" /> ফিচার্ড
              </span>
            )}
          </div>
          {media.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMedia(i)}
                  className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === activeMedia ? "border-primary" : "border-transparent"
                  }`}
                >
                  {m.type === "video" ? (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs">▶</div>
                  ) : (
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
            {listing.pinned && <span className="mr-2">📌</span>}
            {listing.title}
          </h1>
          {listing.breed && (
            <p className="mt-1 text-sm font-medium text-gold">পরিচয়: {listing.breed}</p>
          )}
          {listing.location && (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {listing.location}
            </p>
          )}
          <div className="mt-5 rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-card">
            <div className="text-sm opacity-80">দাম</div>
            <div className="font-display text-4xl font-bold">{formatPriceBn(Number(listing.price))}</div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> বয়স
              </div>
              <div className="mt-1 font-semibold">{formatAgeBn(listing.age_months)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Weight className="h-4 w-4" /> ওজন
              </div>
              <div className="mt-1 font-semibold">{formatWeightBn(listing.weight_kg)}</div>
            </div>
          </div>

          {/* Contact actions */}
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {phone && (
              <a href={`tel:${phone}`}>
                <Button className="h-12 w-full bg-gradient-primary text-primary-foreground hover:opacity-95">
                  <Phone className="mr-2 h-5 w-5" /> কল করুন
                </Button>
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `আমি "${listing.title}" সম্পর্কে জানতে চাই (গরু কিনবো)`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button className="h-12 w-full bg-[oklch(0.62_0.16_150)] text-white hover:opacity-90">
                  <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp
                </Button>
              </a>
            )}
          </div>

          <BookingDialog listingId={listing.id} listingTitle={listing.title} />

          {/* Seller */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                {listing.profiles?.avatar_url ? (
                  <img
                    src={listing.profiles.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl">👤</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  {listing.profiles?.full_name ?? "বিক্রেতা"}
                  <BadgeCheck className="h-4 w-4 text-gold" />
                </div>
                <div className="text-xs text-muted-foreground">Google যাচাইকৃত</div>
              </div>
            </div>

            {listing.farms && (
              <Link
                to="/farms/$id"
                params={{ id: listing.farms.id }}
                className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3 hover:bg-accent/40"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                  {listing.farms.cover_image ? (
                    <img src={listing.farms.cover_image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl">🏡</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{listing.farms.name}</div>
                  {listing.farms.location && (
                    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {listing.farms.location}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-primary">খামার দেখুন →</span>
              </Link>
            )}
          </div>

          {listing.description && (
            <div className="mt-6">
              <h2 className="font-display text-xl font-bold">বিবরণ</h2>
              <p className="mt-2 whitespace-pre-wrap text-foreground/85 leading-relaxed">
                {listing.description}
              </p>
            </div>
          )}

          {listing.buyer_requirements && (
            <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
              <h2 className="font-display text-lg font-bold text-gold">কেনার যোগ্যতা / শর্ত</h2>
              <p className="mt-2 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {listing.buyer_requirements}
              </p>
            </div>
          )}

          {listing.booking_info && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="font-display text-lg font-bold text-primary">বুকিং তথ্য</h2>
              <p className="mt-2 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {listing.booking_info}
              </p>
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            পোস্ট করা হয়েছে: {toBanglaNumber(new Date(listing.created_at).toLocaleDateString("bn-BD"))}
          </p>
        </div>
      </div>
    </div>
  );
}

function BookingDialog({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name || !phone) {
      toast.error("নাম ও ফোন নাম্বার দিন");
      return;
    }
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("বুকিং পাঠাতে লগ ইন করুন");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("booking_requests").insert({
      listing_id: listingId,
      buyer_id: u.user.id,
      buyer_name: name,
      buyer_phone: phone,
      message,
    });
    setSubmitting(false);
    if (error) {
      toast.error("পাঠানো যায়নি", { description: error.message });
      return;
    }
    toast.success("বুকিং রিকোয়েস্ট পাঠানো হয়েছে");
    setOpen(false);
    setName("");
    setPhone("");
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="mt-3 h-12 w-full border-gold/40 text-gold-foreground hover:bg-gold/10"
        >
          <Send className="mr-2 h-4 w-4" /> বুকিং রিকোয়েস্ট পাঠান
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>বুকিং রিকোয়েস্ট</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">"{listingTitle}" এর জন্য</p>
        <div className="space-y-3">
          <div>
            <Label>আপনার নাম</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>ফোন নাম্বার</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <Label>মেসেজ (ঐচ্ছিক)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full bg-gradient-primary">
            {submitting ? "পাঠানো হচ্ছে..." : "পাঠান"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
