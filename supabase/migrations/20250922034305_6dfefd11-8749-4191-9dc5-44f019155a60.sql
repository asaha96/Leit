-- Update schema for full Leit application

-- Add auth_id to users table to map to Supabase Auth
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE;

-- Add mode column to sessions for study vs practice
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS mode text DEFAULT 'study';

-- Add correct column to session_events for practice questions
ALTER TABLE public.session_events ADD COLUMN IF NOT EXISTS correct boolean;

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at columns where missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_decks_updated_at ON public.decks;
CREATE TRIGGER update_decks_updated_at
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cards_updated_at ON public.cards;
CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for authenticated users
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = auth_id);

-- Sessions policies - users can only access their own sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Users can create their own sessions" ON public.sessions;
CREATE POLICY "Users can create their own sessions" 
ON public.sessions 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id));

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
CREATE POLICY "Users can update their own sessions" 
ON public.sessions 
FOR UPDATE 
USING (auth.uid() IN (SELECT auth_id FROM public.users WHERE id = user_id));

-- Session events policies
DROP POLICY IF EXISTS "Users can view their own session events" ON public.session_events;
CREATE POLICY "Users can view their own session events" 
ON public.session_events 
FOR SELECT 
USING (auth.uid() IN (
    SELECT u.auth_id 
    FROM public.users u 
    JOIN public.sessions s ON s.user_id = u.id 
    WHERE s.id = session_id
));

DROP POLICY IF EXISTS "Users can create their own session events" ON public.session_events;
CREATE POLICY "Users can create their own session events" 
ON public.session_events 
FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT u.auth_id 
    FROM public.users u 
    JOIN public.sessions s ON s.user_id = u.id 
    WHERE s.id = session_id
));

-- Decks and cards remain publicly readable for now (can be tightened later)
-- Keep existing dev policies but add user-specific ones

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (auth_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$;

-- Trigger to create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();