import { createClient } from '@supabase/supabase-js';

const url = 'https://yhtgqugdsfwgqvmpulcy.supabase.co';
const key = 'sb_publishable_Ju2xF0_S1YInzEMXECbL5A_XuKfXubO';

const supabase = createClient(url, key);

async function testConnection() {
  console.log('Test de connexion à Supabase sur:', url);
  try {
    // 1. Tester l'authentification / santé
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth check - session:', authData?.session ? 'présente' : 'nulle (normal si pas loggé)');
    if (authError) {
      console.warn('Auth notice:', authError.message);
    }

    // 2. Vérifier si les tables existent
    const { data: spacesData, error: spacesError } = await supabase.from('spaces').select('id, name').limit(5);
    if (spacesError) {
      console.log('Statut de la table "spaces":', spacesError.message, '(Code:', spacesError.code, ')');
    } else {
      console.log('✅ Table "spaces" trouvée ! Contenu:', spacesData);
    }

    const { data: usersData, error: usersError } = await supabase.from('users').select('id, email').limit(5);
    if (usersError) {
      console.log('Statut de la table "users":', usersError.message, '(Code:', usersError.code, ')');
    } else {
      console.log('✅ Table "users" trouvée ! Contenu:', usersData);
    }
  } catch (err: any) {
    console.error('Erreur critique de connexion:', err.message);
  }
}

testConnection();
