-- Leit MVP Database Schema
-- Decks & cards
CREATE TABLE IF NOT EXISTS public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hints TEXT[] DEFAULT '{}',
  answers TEXT[] DEFAULT '{}',  -- acceptable forms
  tags TEXT[] DEFAULT '{}',
  media_refs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users (local for now; map LTI sub later)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_sub TEXT UNIQUE,   -- future LTI sub
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions & per-card events
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,
  score NUMERIC,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  response TEXT,
  ai_score NUMERIC CHECK (ai_score >= 0 AND ai_score <= 1),
  quality TEXT CHECK (quality IN ('again','hard','good','easy')),
  next_due TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (dev-open now; tighten later)
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- Dev policies (open for now)
CREATE POLICY "dev_read_all_decks" ON public.decks FOR SELECT USING (true);
CREATE POLICY "dev_read_all_cards" ON public.cards FOR SELECT USING (true);
CREATE POLICY "dev_read_all_users" ON public.users FOR SELECT USING (true);
CREATE POLICY "dev_read_all_sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "dev_read_all_events" ON public.session_events FOR SELECT USING (true);

CREATE POLICY "dev_insert_all_decks" ON public.decks FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_insert_all_cards" ON public.cards FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_insert_all_users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_insert_all_sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "dev_insert_all_events" ON public.session_events FOR INSERT WITH CHECK (true);

CREATE POLICY "dev_update_all_decks" ON public.decks FOR UPDATE USING (true);
CREATE POLICY "dev_update_all_cards" ON public.cards FOR UPDATE USING (true);
CREATE POLICY "dev_update_all_users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "dev_update_all_sessions" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "dev_update_all_events" ON public.session_events FOR UPDATE USING (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_decks_updated_at
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo user
INSERT INTO public.users (display_name, external_sub) 
VALUES ('Local Demo User', 'local-demo-user') 
ON CONFLICT (external_sub) DO NOTHING;

-- Insert demo deck with cards
WITH demo_deck AS (
  INSERT INTO public.decks (title, tags, source)
  VALUES ('Geography Basics', ARRAY['geography', 'capitals'], 'demo')
  ON CONFLICT DO NOTHING
  RETURNING id
),
demo_cards AS (
  SELECT id as deck_id FROM demo_deck
  UNION ALL
  SELECT id FROM public.decks WHERE title = 'Geography Basics' LIMIT 1
)
INSERT INTO public.cards (deck_id, front, back, hints, answers, tags)
SELECT 
  deck_id,
  front,
  back,
  ARRAY[hint],
  string_to_array(answers, '|'),
  string_to_array(tags, ',')
FROM demo_cards,
(VALUES 
  ('What is the capital of France?', 'Paris', 'Starts with P', 'Paris|Paris, France', 'geography,europe'),
  ('What is 2 + 2?', '4', 'Basic arithmetic', '4|four', 'math,basic'),
  ('What is the largest planet?', 'Jupiter', 'Gas giant', 'Jupiter', 'astronomy,planets')
) AS demo_data(front, back, hint, answers, tags)
ON CONFLICT DO NOTHING;