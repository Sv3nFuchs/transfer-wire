-- Player photos: a URL column on players plus a public storage bucket.
-- The bucket is public so photos can be shown with a plain URL (no signing);
-- only admins can write, matching the club-logos policies.
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('player-photos', 'player-photos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "player_photos_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "player_photos_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "player_photos_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'));
