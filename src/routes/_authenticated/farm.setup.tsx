import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/farm/setup")({
  component: FarmSetup,
});

function FarmSetup() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: farm } = await supabase
        .from("farms")
        .select("id, name, description, location")
        .eq("owner_id", uid)
        .maybeSingle();
      if (farm) {
        setId(farm.id);
        setName(farm.name);
        setDescription(farm.description ?? "");
        setLocation(farm.location ?? "");
      }
    });
  }, []);

  const save = async () => {
    if (!userId || !name) {
      toast.error("খামারের নাম দিন");
      return;
    }
    setSaving(true);
    if (id) {
      const { error } = await supabase
        .from("farms")
        .update({ name, description, location })
        .eq("id", id);
      setSaving(false);
      if (error) toast.error(error.message);
      else {
        toast.success("আপডেট হয়েছে");
        await supabase.from("profiles").update({ user_type: "farm" }).eq("id", userId);
      }
    } else {
      const { data, error } = await supabase
        .from("farms")
        .insert({ owner_id: userId, name, description, location })
        .select("id")
        .single();
      setSaving(false);
      if (error) toast.error(error.message);
      else {
        toast.success("খামার তৈরি হয়েছে");
        await supabase.from("profiles").update({ user_type: "farm" }).eq("id", userId);
        setId(data.id);
        router.navigate({ to: "/dashboard" });
      }
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">খামার সেটআপ</h1>
      <p className="mt-1 text-muted-foreground">আপনার খামারের প্রোফাইল তৈরি করুন</p>

      <div className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div>
          <Label>খামারের নাম *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>এলাকা</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="যেমন: পাবনা" />
        </div>
        <div>
          <Label>বিবরণ</Label>
          <Textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="খামার সম্পর্কে বলুন..."
          />
        </div>
        <Button onClick={save} disabled={saving} className="w-full bg-gradient-primary">
          {saving ? "সংরক্ষণ হচ্ছে..." : id ? "আপডেট করুন" : "খামার তৈরি করুন"}
        </Button>
      </div>
    </div>
  );
}
