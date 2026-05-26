
-- 1. Separate sensitive seller contact data from public listings
CREATE TABLE IF NOT EXISTS public.listing_contacts (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  phone text,
  whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrate existing data
INSERT INTO public.listing_contacts (listing_id, phone, whatsapp)
SELECT id, phone, whatsapp FROM public.listings
WHERE phone IS NOT NULL OR whatsapp IS NOT NULL
ON CONFLICT (listing_id) DO NOTHING;

ALTER TABLE public.listing_contacts ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view contact info
CREATE POLICY "listing_contacts_select_authenticated"
ON public.listing_contacts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "listing_contacts_insert_own"
ON public.listing_contacts FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.id = listing_contacts.listing_id AND l.seller_id = auth.uid()
));

CREATE POLICY "listing_contacts_update_own"
ON public.listing_contacts FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.id = listing_contacts.listing_id AND l.seller_id = auth.uid()
));

CREATE POLICY "listing_contacts_delete_own"
ON public.listing_contacts FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.id = listing_contacts.listing_id AND l.seller_id = auth.uid()
));

CREATE TRIGGER set_listing_contacts_updated_at
BEFORE UPDATE ON public.listing_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Drop sensitive phone/whatsapp columns from publicly-readable listings
ALTER TABLE public.listings DROP COLUMN IF EXISTS phone;
ALTER TABLE public.listings DROP COLUMN IF EXISTS whatsapp;

-- 3. Drop phone/whatsapp from publicly-readable profiles (contact lives per-listing)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS whatsapp;

-- 4. Harden booking_requests: ensure buyer_id is always the authenticated user
UPDATE public.booking_requests SET buyer_id = gen_random_uuid() WHERE buyer_id IS NULL;
ALTER TABLE public.booking_requests ALTER COLUMN buyer_id SET NOT NULL;
ALTER TABLE public.booking_requests ALTER COLUMN buyer_id SET DEFAULT auth.uid();

-- Restrict insert policy strictly to authenticated buyers with matching uid
DROP POLICY IF EXISTS booking_requests_insert_auth ON public.booking_requests;
CREATE POLICY "booking_requests_insert_auth"
ON public.booking_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Restrict select policies to authenticated only
DROP POLICY IF EXISTS booking_requests_select_buyer ON public.booking_requests;
DROP POLICY IF EXISTS booking_requests_select_seller ON public.booking_requests;

CREATE POLICY "booking_requests_select_buyer"
ON public.booking_requests FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

CREATE POLICY "booking_requests_select_seller"
ON public.booking_requests FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.listings l
  WHERE l.id = booking_requests.listing_id AND l.seller_id = auth.uid()
));
