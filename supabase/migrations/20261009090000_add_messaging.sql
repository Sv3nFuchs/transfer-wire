-- Messaging, adults only for now.
--
-- Design rules baked into the database:
--  * Only people who confirmed they are 18+ (a row in messaging_profiles) can
--    send or receive messages. Players are reached through the adult account
--    that owns their profile, never directly.
--  * Conversations are 1:1 and are created only through start_conversation(),
--    which checks adult status, blocks and a daily limit.
--  * Messages cannot be edited or deleted by users. Reports keep a snapshot of
--    the reported message so admins never need to read whole chats.

-- 1. Who has turned messaging on (and confirmed they are an adult)
CREATE TABLE public.messaging_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60),
  adult_confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type text CHECK (subject_type IN ('player', 'club')),
  subject_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX conversation_members_user_idx ON public.conversation_members (user_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);

CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  message_id uuid NOT NULL,
  message_body text NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Helper functions (SECURITY DEFINER so policies never recurse)
CREATE FUNCTION public.is_conversation_member(_conversation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation AND user_id = auth.uid()
  );
$$;

CREATE FUNCTION public.is_adult_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.messaging_profiles WHERE user_id = auth.uid());
$$;

CREATE FUNCTION public.shares_conversation_with(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members a
    JOIN public.conversation_members b ON a.conversation_id = b.conversation_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user
  );
$$;

CREATE FUNCTION public.conversation_has_block(_conversation uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members m
    JOIN public.user_blocks b
      ON (b.blocker_id = auth.uid() AND b.blocked_id = m.user_id)
      OR (b.blocked_id = auth.uid() AND b.blocker_id = m.user_id)
    WHERE m.conversation_id = _conversation AND m.user_id <> auth.uid()
  );
$$;

-- Can this person receive messages? (Used to decide whether to show a Message button.)
CREATE FUNCTION public.can_message(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.messaging_profiles WHERE user_id = _user);
$$;

-- 3. Row level security
ALTER TABLE public.messaging_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See yourself and people you talk to" ON public.messaging_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.shares_conversation_with(user_id));
CREATE POLICY "Create your own messaging profile" ON public.messaging_profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Rename yourself" ON public.messaging_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see their conversations" ON public.conversations
  FOR SELECT TO authenticated USING (public.is_conversation_member(id));

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see who is in their conversations" ON public.conversation_members
  FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id));
CREATE POLICY "Update your own read marker" ON public.conversation_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id));
CREATE POLICY "Adults send into their own conversations" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_adult_member()
    AND public.is_conversation_member(conversation_id)
    AND NOT public.conversation_has_block(conversation_id)
  );
CREATE POLICY "Admins can remove messages" ON public.messages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See your own blocks" ON public.user_blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "Block someone" ON public.user_blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Unblock someone" ON public.user_blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reports" ON public.message_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.message_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Actions that must go through checked functions
CREATE FUNCTION public.start_conversation(
  _recipient uuid, _subject_type text, _subject_id uuid, _body text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  cid uuid;
  clean text := btrim(_body);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Log in to send messages'; END IF;
  IF me = _recipient THEN RAISE EXCEPTION 'You cannot message yourself'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging_profiles WHERE user_id = me) THEN
    RAISE EXCEPTION 'Confirm that you are 18 or older to use messages';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging_profiles WHERE user_id = _recipient) THEN
    RAISE EXCEPTION 'This person has not turned on messages';
  END IF;
  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = me AND blocked_id = _recipient) OR (blocker_id = _recipient AND blocked_id = me)
  ) THEN
    RAISE EXCEPTION 'You cannot message this person';
  END IF;
  IF char_length(clean) < 1 OR char_length(clean) > 2000 THEN
    RAISE EXCEPTION 'A message must be 1 to 2000 characters';
  END IF;

  SELECT c.id INTO cid
  FROM conversations c
  JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = me
  JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = _recipient
  LIMIT 1;

  IF cid IS NULL THEN
    IF (SELECT count(*) FROM conversations WHERE created_by = me AND created_at > now() - interval '1 day') >= 20 THEN
      RAISE EXCEPTION 'You have reached the daily limit for new conversations';
    END IF;
    INSERT INTO conversations (created_by, subject_type, subject_id)
    VALUES (me, _subject_type, _subject_id) RETURNING id INTO cid;
    INSERT INTO conversation_members (conversation_id, user_id) VALUES (cid, me), (cid, _recipient);
  END IF;

  INSERT INTO messages (conversation_id, sender_id, body) VALUES (cid, me, clean);
  UPDATE conversation_members SET last_read_at = clock_timestamp()
  WHERE conversation_id = cid AND user_id = me;
  RETURN cid;
END;
$$;

CREATE FUNCTION public.report_message(_message uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  msg messages%ROWTYPE;
BEGIN
  SELECT * INTO msg FROM messages WHERE id = _message;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM conversation_members WHERE conversation_id = msg.conversation_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  IF msg.sender_id = auth.uid() THEN RAISE EXCEPTION 'You cannot report your own message'; END IF;
  INSERT INTO message_reports (reporter_id, reported_user_id, conversation_id, message_id, message_body, reason)
  VALUES (auth.uid(), msg.sender_id, msg.conversation_id, msg.id, msg.body, btrim(_reason));
END;
$$;

CREATE FUNCTION public.unread_message_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int
  FROM messages m
  JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = auth.uid()
  WHERE m.sender_id <> auth.uid() AND m.created_at > cm.last_read_at;
$$;

-- Only signed-in users may call these.
REVOKE ALL ON FUNCTION public.is_conversation_member(uuid), public.is_adult_member(),
  public.shares_conversation_with(uuid), public.conversation_has_block(uuid),
  public.can_message(uuid), public.start_conversation(uuid, text, uuid, text),
  public.report_message(uuid, text), public.unread_message_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid), public.is_adult_member(),
  public.shares_conversation_with(uuid), public.conversation_has_block(uuid),
  public.can_message(uuid), public.start_conversation(uuid, text, uuid, text),
  public.report_message(uuid, text), public.unread_message_count() TO authenticated;
