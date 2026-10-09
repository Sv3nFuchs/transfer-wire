-- Injuries.
--  * players: a current status (null means fit) with a note and dates.
--  * match_player_ratings: whether the player came off injured in that match,
--    and the minute (45 = half time).

ALTER TABLE public.players
  ADD COLUMN injury_status text CHECK (injury_status IN ('injured', 'doubtful')),
  ADD COLUMN injury_note text,
  ADD COLUMN injury_since date,
  ADD COLUMN injury_expected_return date;

ALTER TABLE public.match_player_ratings
  ADD COLUMN injured_off boolean NOT NULL DEFAULT false,
  ADD COLUMN minute_off smallint CHECK (minute_off BETWEEN 0 AND 130);
