-- Trials are a new transfers.org_type value ("trial"), alongside the
-- existing "club" / "school" / "national". Unlike a permanent move, a
-- trial has both a start and an end — transfer_date is reused as the
-- start, and this column holds the end of the period.
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS end_date date;
