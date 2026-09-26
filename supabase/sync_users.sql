-- ==============================================================================
-- SPOTWORK / PROPTECH MAROC - SYNCHRONISATION UTILISATEURS SUPABASE
-- À exécuter dans Supabase Cloud > SQL Editor
-- ==============================================================================

-- 1. Rendre la table public.users lisible par l'application web
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Public can view users" ON public.users;
DROP POLICY IF EXISTS "Public can view demo users" ON public.users;
CREATE POLICY "Public can view users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert users" ON public.users;
CREATE POLICY "Public can insert users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update users" ON public.users;
DROP POLICY IF EXISTS "Public can update demo users" ON public.users;
CREATE POLICY "Public can update users" ON public.users FOR UPDATE USING (true);

-- 2. Synchroniser tous les utilisateurs créés dans Supabase Authentication (auth.users) vers public.users
INSERT INTO public.users (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
    COALESCE((raw_user_meta_data->>'role')::user_role, 'client'::user_role)
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, 
    full_name = EXCLUDED.full_name;

-- 3. Trigger automatique pour tout nouvel utilisateur créé dans Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'::user_role)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Rafraîchir le cache d'API Supabase PostgREST
NOTIFY pgrst, 'reload schema';
