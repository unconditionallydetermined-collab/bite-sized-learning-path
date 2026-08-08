-- 3. Revert the most recent song addition to the unlock queue (highest position).
DELETE FROM public.song_queue sq
WHERE sq.user_id = '73804dc1-57c0-4b73-969c-648d46e556bf'
  AND sq.position = (
    SELECT max(position) FROM public.song_queue
    WHERE user_id = '73804dc1-57c0-4b73-969c-648d46e556bf'
  );

-- 4. + 6. Set the gem balance to the corrected value.
UPDATE public.profiles SET gems = 118 WHERE id = '73804dc1-57c0-4b73-969c-648d46e556bf';

-- 5. The portfolio video stalled on a short final bit: record it and the unit completion.
INSERT INTO public.bit_progress (user_id, unit_id, bit_index, bit_seconds)
VALUES
  ('73804dc1-57c0-4b73-969c-648d46e556bf', '03c51543-a74a-4fd4-bf18-aefb4e06dc9a', 3, 35),
  ('73804dc1-57c0-4b73-969c-648d46e556bf', '03c51543-a74a-4fd4-bf18-aefb4e06dc9a', -1, 0)
ON CONFLICT (user_id, unit_id, bit_index) DO NOTHING;