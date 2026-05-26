import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/listings/new")({
  component: NewListing,
});

type MediaFile = { file: File; url: string; type: "image" | "video" };

function NewListing() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [breed, setBreed] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [requirements, setRequirements] = useState("");
  const [bookingInfo, setBookingInfo] = useState("");
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        const { data: farm } = await supabase
          .from("farms")
          .select("id")
          .eq("owner_id", id)
          .maybeSingle();
        setFarmId(farm?.id ?? null);
      }
    });
  }, []);



  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const arr: MediaFile[] = [];
    for (const f of Array.from(files)) {
      const type: "image" | "video" = f.type.startsWith("video") ? "video" : "image";
      arr.push({ file: f, url: URL.createObjectURL(f), type });
    }
    setMedia((m) => [...m, ...arr].slice(0, 10));
  };

  const removeMedia = (i: number) => setMedia((m) => m.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!userId) return;
    if (!title || !price) {
      toast.error("শিরোনাম ও দাম দিন");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > 99999999) {
      toast.error("দাম সঠিক নয়", { description: "দাম ১ থেকে ৯,৯৯,৯৯,৯৯৯ টাকার মধ্যে দিন" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: userId,
          farm_id: farmId,
          title,
          breed: breed || null,
          description: description || null,
          price: Number(price),
          age_months: age ? Number(age) : null,
          weight_kg: weight ? Number(weight) : null,
          location: location || null,
          buyer_requirements: requirements || null,
          booking_info: bookingInfo || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        const path = `${userId}/${listing.id}/${Date.now()}-${i}-${m.file.name}`;
        const { error: upErr } = await supabase.storage
          .from("listing-media")
          .upload(path, m.file, { upsert: false, contentType: m.file.type });
        if (upErr) {
          toast.error(`ফাইল আপলোড ব্যর্থ: ${upErr.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from("listing-media").getPublicUrl(path);
        await supabase.from("listing_media").insert({
          listing_id: listing.id,
          url: pub.publicUrl,
          type: m.type,
          sort_order: i,
        });
      }

      // Save seller contact for this listing (auth-only readable)
      if (phone || whatsapp) {
        await supabase.from("listing_contacts").upsert({
          listing_id: listing.id,
          phone: phone || null,
          whatsapp: whatsapp || null,
        });
      }


      toast.success("বিজ্ঞাপন প্রকাশিত হয়েছে!");
      router.navigate({ to: "/listings/$id", params: { id: listing.id } });
    } catch (e: any) {
      const msg = e?.message || e?.error_description || e?.hint || e?.details || (typeof e === "string" ? e : JSON.stringify(e));
      toast.error("পোস্ট ব্যর্থ", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">নতুন বিজ্ঞাপন</h1>
      <p className="mt-1 text-muted-foreground">আপনার গরুর তথ্য দিন</p>

      <div className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div>
          <Label>শিরোনাম *</Label>
          <Input
            placeholder="যেমন: দেশি বড় ষাঁড়, ৬ দাঁত"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label>গরুর পরিচয় / জাত</Label>
          <Input
            placeholder="যেমন: ব্রাহমা, শাহীওয়াল, দেশি"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
          />
        </div>

        <div>
          <Label>ছবি/ভিডিও আপলোড</Label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.map((m, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                {m.type === "video" ? (
                  <video src={m.url} className="h-full w-full object-cover" />
                ) : (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {media.length < 10 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground hover:border-primary hover:text-primary">
                <Upload className="h-6 w-6" />
                <span className="mt-1 text-xs">যোগ করুন</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">সর্বোচ্চ ১০টি ছবি/ভিডিও</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>দাম (৳) *</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>এলাকা</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ঢাকা" />
          </div>
          <div>
            <Label>বয়স (মাস)</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <Label>ওজন (কেজি)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <Label>মোবাইল</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <Label>WhatsApp (ঐচ্ছিক)</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>বিবরণ</Label>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="গরু সম্পর্কে বিস্তারিত লিখুন..."
          />
        </div>

        <div>
          <Label>কেনার জন্য কী যোগ্যতা/শর্ত লাগবে</Label>
          <Textarea
            rows={3}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="যেমন: অগ্রিম পেমেন্ট, NID ভেরিফিকেশন..."
          />
        </div>

        <div>
          <Label>বুকিং তথ্য</Label>
          <Textarea
            rows={3}
            value={bookingInfo}
            onChange={(e) => setBookingInfo(e.target.value)}
            placeholder="বুকিং প্রসেস, ডেলিভারি, কন্টাক্ট..."
          />
        </div>

        <Button
          onClick={submit}
          disabled={submitting}
          className="h-12 w-full bg-gradient-primary text-primary-foreground"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          বিজ্ঞাপন প্রকাশ করুন
        </Button>
      </div>
    </div>
  );
}
