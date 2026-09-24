# Spotwork — Plateforme de Gestion d'Espaces de Coworking avec IA

Plateforme moderne de réservation et d'administration d'espaces de coworking (open spaces, bureaux privés, salles de réunion, studios créatifs, cabines focus) équipée d'un moteur de recommandations hyper-personnalisées propulsé par l'**API Claude d'Anthropic**, d'une base de données relationnelle **PostgreSQL hébergée sur Supabase** avec **Row Level Security (RLS)**, et d'une **API REST Node.js / Express (TypeScript)** sécurisée.

---

## 🏗️ Architecture du Système

```
PropTech/
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # Pipeline GitHub Actions (Tests, Build, Docker)
├── backend/
│   ├── src/
│   │   ├── config/               # Variables d'env (Zod) & clients Supabase/LocalStore
│   │   ├── middleware/           # Auth JWT, RBAC, Zod Validate, ErrorHandler
│   │   ├── controllers/          # Espaces, Réservations, Recommandations IA, Avis, Manager
│   │   ├── services/             # ClaudeService (Anthropic), BookingService (Anti-overlap), AnalyticsService
│   │   ├── validators/           # Schémas de validation Zod
│   │   ├── routes/               # Définitions des routes Express REST
│   │   ├── app.ts                # Configuration Express (Helmet, CORS, Rate-Limiting)
│   │   └── server.ts             # Point d'entrée HTTP
│   ├── tests/                    # 23 tests automatisés (Vitest + Supertest)
│   ├── Dockerfile                # Image conteneur multi-stage
│   ├── package.json
│   └── tsconfig.json
├── supabase/
│   ├── migrations/
│   │   ├── 01_init_schema.sql    # 5 tables, triggers, ENUMs et index
│   │   └── 02_rls_policies.sql   # Politiques Row Level Security
│   └── seed.sql                  # Données d'amorçage (utilisateurs, 10 espaces, réservations)
├── Index.html                    # Interface utilisateur React Spotwork
├── docker-compose.yml            # Orchestration locale
├── vercel.json                   # Déploiement serverless Vercel
└── README.md
```

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** `>= 20.0.0` (testé et validé avec Node v22.23.2)
- **npm** `>= 10.0.0`

### 1. Installation des dépendances
```bash
cd backend
npm install
```

### 2. Configuration des variables d'environnement
Copiez le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```

Contenu type de `backend/.env` :
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=*

# Supabase Cloud (Optionnel pour tester en local via le store résilient intégré)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role

# Anthropic Claude API (Optionnel, active le fallback heuristique si non renseignée)
ANTHROPIC_API_KEY=sk-ant-api03-...

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 3. Exécution des tests automatisés
```bash
npm test
```
*Le projet dispose de 23 tests couvrant l'algorithme d'anti-chevauchement, le filtrage, le contrôle d'accès RBAC et les recommandations.*

### 4. Lancement du serveur API en développement
```bash
npm run dev
```
L'API démarre sur `http://localhost:5000`.

### 5. Lancement de l'interface frontend
Ouvrez simplement `Index.html` dans votre navigateur (ou via une extension Live Server / `npx serve .`). L'application détecte automatiquement le backend et passe en mode **🟢 API Active (Supabase & IA)** !

---

## 🗄️ Base de Données PostgreSQL & Supabase

### Schéma des Tables
1. **`users`** : Comptes clients, gestionnaires et administrateurs, avec préférences personnalisées (`JSONB`).
2. **`spaces`** : Espaces de travail avec géolocalisation (`latitude`/`longitude`), équipements (`JSONB`), photos et note moyenne recalculée automatiquement par trigger.
3. **`bookings`** : Réservations avec date, créneau horaire, montant total et statut (`pending`, `confirmed`, `cancelled`, `completed`).
4. **`reviews`** : Avis et notes de 1 à 5 étoiles laissés par des clients ayant réservé l'espace.
5. **`ai_recommendations`** : Recommandations personnalisées générées par Claude avec explication textuelle et tracking du clic.

### Exécution des Migrations sur Supabase Cloud
1. Rendez-vous dans votre projet Supabase $\rightarrow$ **SQL Editor**.
2. Exécutez le script [supabase/migrations/01_init_schema.sql](file:///c:/Users/USF/Desktop/PropTech/supabase/migrations/01_init_schema.sql).
3. Exécutez le script [supabase/migrations/02_rls_policies.sql](file:///c:/Users/USF/Desktop/PropTech/supabase/migrations/02_rls_policies.sql).
4. *(Optionnel)* Exécutez [supabase/seed.sql](file:///c:/Users/USF/Desktop/PropTech/supabase/seed.sql) pour charger les espaces de démonstration.

---

## 🤖 Moteur d'IA Claude (Anthropic API)

Le service [claudeService.ts](file:///c:/Users/USF/Desktop/PropTech/backend/src/services/claudeService.ts) injecte dans le prompt de Claude 3.5 Sonnet :
1. **Les préférences de l'utilisateur** : budget horaire max, ville préférée, équipements requis (fibre, café, écran, etc.).
2. **L'historique récent de réservations** et les avis passés.
3. **Le catalogue d'espaces disponibles**.

Claude retourne une sélection argumentée de **3 espaces** avec un score de matching et une raison personnalisée rédigée en français naturel.

> **Mode Fallback Transparent :** Si la variable `ANTHROPIC_API_KEY` n'est pas configurée en environnement de développement local, un algorithme déterministe prend le relais instantanément sans interrompre l'expérience utilisateur.

---

## 🛡️ Algorithme Anti-Chevauchement de Réservations

Pour garantir l'absence totale de sur-réservation, le service [bookingService.ts](file:///c:/Users/USF/Desktop/PropTech/backend/src/services/bookingService.ts) applique la règle stricte :
$$\text{Nouvelle Début} < \text{Existante Fin} \quad \land \quad \text{Nouvelle Fin} > \text{Existante Début}$$

Tout conflit sur la même date et le même espace retourne un code `409 Conflict` avec le détail du créneau déjà occupé.

---

## 📡 Référence des Endpoints REST

| Méthode | Route | Description | Auth requise |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Statut de l'API et des services connectés | Non |
| `POST` | `/api/auth/register` | Inscription nouvel utilisateur | Non |
| `POST` | `/api/auth/login` | Connexion utilisateur (retourne le token JWT) | Non |
| `GET` | `/api/auth/me` | Profil et préférences de l'utilisateur connecté | Bearer Token |
| `PATCH`| `/api/auth/preferences` | Mise à jour des préférences de recherche | Bearer Token |
| `GET` | `/api/spaces` | Liste des espaces (filtres: `city`, `max_price`, etc.) | Non |
| `GET` | `/api/spaces/:id` | Détail d'un espace avec avis et hôte | Non |
| `POST` | `/api/spaces` | Création d'un espace | Bearer (`manager`, `admin`) |
| `POST` | `/api/bookings` | Création d'une réservation (vérification anti-overlap) | Bearer (`client`) |
| `GET` | `/api/bookings/user` | Liste des réservations de l'utilisateur connecté | Bearer |
| `PATCH`| `/api/bookings/:id/cancel` | Annulation d'une réservation | Bearer |
| `GET` | `/api/recommendations` | Top 3 recommandations IA personnalisées | Bearer (`client`) |
| `POST` | `/api/recommendations/:id/click` | Télémétrie : enregistrement du clic | Bearer (`client`) |
| `POST` | `/api/reviews` | Dépôt d'un avis client après réservation | Bearer (`client`) |
| `GET` | `/api/manager/dashboard` | Statistiques gestionnaire (revenus, occupation, IA) | Bearer (`manager`, `admin`) |

---

## 📦 Déploiement

### Déploiement Docker & Docker Compose
```bash
docker compose up --build -d
```

### Déploiement Vercel
Le dépôt inclut la configuration [vercel.json](file:///c:/Users/USF/Desktop/PropTech/vercel.json) pour déployer le frontend statique et l'API serverless Node.js en une seule commande :
```bash
vercel deploy
```

### Déploiement Render / Railway
1. Créez un nouveau service Web pointant sur le dossier `backend`.
2. Définissez la commande de build : `npm install && npm run build`.
3. Définissez la commande de démarrage : `npm start`.
