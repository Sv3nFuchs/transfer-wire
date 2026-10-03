-- Storage uploads with upsert need a SELECT policy on storage.objects,
-- even for a public bucket (public URLs themselves bypass RLS).
CREATE POLICY "player_photos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'player-photos');
