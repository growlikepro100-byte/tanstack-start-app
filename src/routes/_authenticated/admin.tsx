import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pin, PinOff, Trash2, Upload, X, Loader2, Send, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatPriceBn, toBanglaNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/login" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
  component: AdminPanel,
});

function AdminPanel() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">এডমিন প্যানেল</h1>
        <p className="mt-1 text-muted-foreground">
          সব পোস্ট, ইউজার ও নোটিফিকেশন ম্যানেজ করুন
        </p>
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="listings">পোস্ট</TabsTrigger>
          <TabsTrigger value="add">গরু যোগ</TabsTrigger>
          <TabsTrigger value="notify">নোটিফিকেশন</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          <ListingsManager />
        </TabsContent>
        <TabsContent value="add" className="mt-6">
          <AddCowForm />
        </TabsContent>
        <TabsContent value="notify" className="mt-6">
          <NotifyForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- Listings Manager ----------------------------- */

type Row = {
  id: string;
  title: string;
  price: number;
  location: string | null;
  pinned: boolean;
  featured: boolean;
  status: string;
  created_at: string;
  seller_id: string;
  listing_media: { url: string; sort_order: number }[];
};

function ListingsManager() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, title, price, location, pinned, featured, status, created_at, seller_id, listing_media(url, sort_order)",
        )
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Row[];
    },
  });

  const togglePin = async (r: Row) => {
    const { error } = await supabase
      .from("listings")
      .update({ pinned: !r.pinned })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(!r.pinned ? "পিন করা হয়েছে" : "পিন সরানো হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    qc.invalidateQueries({ queryKey: ["listings", "browse"] });
  };

  const remove = async (r: Row) => {
    if (!confirm(`"${r.title}" পোস্ট ডিলিট করবেন?`)) return;
    const { error } = await supabase.from("listings").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("ডিলিট হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    qc.invalidateQueries({ queryKey: ["listings", "browse"] });
  };

  if (isLoading) return <p className="text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const cover = [...r.listing_media].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
        return (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
          >
            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {cover ? (
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">🐄</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to="/listings/$id"
                params={{ id: r.id }}
                className="block truncate font-semibold hover:text-primary"
              >
                {r.pinned && "📌 "}
                {r.title}
              </Link>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {formatPriceBn(Number(r.price))} • {r.location ?? "—"} •{" "}
                {toBanglaNumber(new Date(r.created_at).toLocaleDateString("bn-BD"))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={r.pinned ? "default" : "outline"}
                onClick={() => togglePin(r)}
              >
                {r.pinned ? (
                  <>
                    <PinOff className="mr-1 h-4 w-4" /> আনপিন
                  </>
                ) : (
                  <>
                    <Pin className="mr-1 h-4 w-4" /> পিন
                  </>
                )}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(r)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="text-center text-muted-foreground">কোন পোস্ট নেই</p>
      )}
    </div>
  );
}

/* --------------------------------- Add Cow --------------------------------- */

type MediaFile = { file: File; url: string; type: "image" | "video" };

function AddCowForm() {
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [breed, setBreed] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [weight, setWeight] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [requirements, setRequirements] = useState("");
  const [bookingInfo, setBookingInfo] = useState("");
  const [pinned, setPinned] = useState(false);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
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

  const reset = () => {
    setTitle("");
    setBreed("");
    setDescription("");
    setPrice("");
    setAgeYears("");
    setAgeMonths("");
    setWeight("");
    setLocation("");
    setPhone("");
    setWhatsapp("");
    setRequirements("");
    setBookingInfo("");
    setPinned(false);
    setMedia([]);
  };

  const submit = async () => {
    if (!userId) return;
    if (!title || !price) return toast.error("নাম ও দাম দিন");
    setSubmitting(true);
    try {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: userId,
          title,
          breed: breed || null,
          description: description || null,
          price: Number(price),
          age_months: (Number(ageYears) || 0) * 12 + (Number(ageMonths) || 0) || null,
          weight_kg: weight ? Number(weight) : null,
          location: location || null,
          buyer_requirements: requirements || null,
          booking_info: bookingInfo || null,
          pinned,
        })
        .select("id")
        .single();
      if (error) throw error;

      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        const path = `${userId}/${listing.id}/${Date.now()}-${i}-${m.file.name}`;
        const { error: upErr } = await supabase.storage
          .from("listing-media")
          .upload(path, m.file, { contentType: m.file.type });
        if (upErr) {
          toast.error(upErr.message);
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

      if (phone || whatsapp) {
        await supabase.from("listing_contacts").upsert({
          listing_id: listing.id,
          phone: phone || null,
          whatsapp: whatsapp || null,
        });
      }

      toast.success("গরু যোগ হয়েছে!");
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div>
        <Label>গরুর নাম / শিরোনাম *</Label>
        <Input
          placeholder="যেমন: রাজা — দেশি বড় ষাঁড়"
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
        <Label>ছবি/ভিডিও</Label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.map((m, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg border">
              {m.type === "video" ? (
                <video src={m.url} className="h-full w-full object-cover" />
              ) : (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                onClick={() => setMedia((mm) => mm.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {media.length < 10 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground hover:border-primary">
              <Upload className="h-6 w-6" />
              <span className="mt-1 text-xs">যোগ</span>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>দাম (৳) *</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <Label>এলাকা</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label>বয়স - বছর</Label>
          <Input type="number" min="0" value={ageYears} onChange={(e) => setAgeYears(e.target.value)} />
        </div>
        <div>
          <Label>বয়স - মাস</Label>
          <Input type="number" min="0" max="11" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} />
        </div>
        <div>
          <Label>ওজন (কেজি)</Label>
          <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <Label>মোবাইল</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>বিবরণ</Label>
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="গরু সম্পর্কে বিস্তারিত..."
        />
      </div>

      <div>
        <Label>কেনার জন্য কী যোগ্যতা/শর্ত লাগবে</Label>
        <Textarea
          rows={3}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="যেমন: অগ্রিম ৫০% পেমেন্ট, NID ভেরিফিকেশন..."
        />
      </div>

      <div>
        <Label>বুকিং তথ্য</Label>
        <Textarea
          rows={3}
          value={bookingInfo}
          onChange={(e) => setBookingInfo(e.target.value)}
          placeholder="বুকিং প্রসেস, ডেলিভারি, কন্টাক্ট ইত্যাদি..."
        />
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="h-4 w-4"
        />
        <Pin className="h-4 w-4" />
        <span className="text-sm font-medium">উপরে পিন করে রাখুন</span>
      </label>

      <Button
        onClick={submit}
        disabled={submitting}
        className="h-12 w-full bg-gradient-primary text-primary-foreground"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Plus className="mr-1 h-5 w-5" /> গরু যোগ করুন
      </Button>
    </div>
  );
}

/* ------------------------------- Notify Form ------------------------------- */

function NotifyForm() {
  const [target, setTarget] = useState<"all" | "user">("all");
  const [userId, setUserId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as { id: string; full_name: string | null }[];
    },
  });

  const send = async () => {
    if (!title || !message) return toast.error("শিরোনাম ও মেসেজ লিখুন");
    if (target === "user" && !userId) return toast.error("ইউজার নির্বাচন করুন");
    setSending(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const rows =
        target === "all"
          ? users.map((p) => ({
              user_id: p.id,
              title,
              message,
              created_by: u.user?.id,
            }))
          : [{ user_id: userId, title, message, created_by: u.user?.id }];
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      toast.success(`${toBanglaNumber(rows.length)} জনকে পাঠানো হয়েছে`);
      setTitle("");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div>
        <Label>কাকে পাঠাবেন</Label>
        <Select value={target} onValueChange={(v) => setTarget(v as "all" | "user")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ইউজার</SelectItem>
            <SelectItem value="user">নির্দিষ্ট ইউজার</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {target === "user" && (
        <div>
          <Label>ইউজার</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder="বেছে নিন" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ?? u.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>শিরোনাম</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="যেমন: ইনফরমেশন আপডেট করুন"
        />
      </div>

      <div>
        <Label>মেসেজ</Label>
        <Textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="আপনার বার্তা লিখুন..."
        />
      </div>

      <Button
        onClick={send}
        disabled={sending}
        className="h-12 w-full bg-gradient-primary text-primary-foreground"
      >
        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Send className="mr-2 h-4 w-4" /> পাঠিয়ে দিন
      </Button>
    </div>
  );
}
