# CONFORYS API — Documentation technique

## Structure du projet

```
conforys/
├── server.js                        # Point d'entrée — démarre le serveur
├── prisma/
│   └── schema.prisma                # Modèles de la base de données
└── src/
    ├── app.js                       # Configuration Express + branchement routes
    ├── config/
    │   └── prisma.js                # Instance Prisma partagée
    ├── middlewares/
    │   └── authMiddleware.js        # Protection JWT des routes
    ├── routes/
    │   ├── authRoutes.js
    │   ├── userRoutes.js
    │   ├── entrepriseRoutes.js
    │   ├── incidentsRoutes.js
    │   ├── epiRoutes.js
    │   ├── auditRoutes.js
    │   └── dashboardRoutes.js
    ├── controllers/
    │   ├── authController.js
    │   ├── userController.js
    │   ├── entrepriseController.js
    │   ├── incidentsController.js
    │   ├── epiController.js
    │   ├── auditController.js
    │   └── dashboardController.js
    └── services/                    # Logique métier (couche entre controller et Prisma)
        ├── incidentService.js
        ├── epiService.js
        ├── auditService.js
        └── dashboardService.js
```

---

## Ce qui existe dans le projet, fichier par fichier

---

### server.js
Le **point d'entrée** de l'application. Il fait 3 choses dans l'ordre :
1. Charge les variables d'environnement (`.env`)
2. Connecte Prisma à PostgreSQL
3. Démarre le serveur Express sur le port 5000

---

### src/app.js
Le **chef d'orchestre** de l'API. Il ne démarre rien — il configure Express :
- Active CORS (pour que le frontend React puisse appeler l'API)
- Active la lecture du JSON dans les requêtes
- Branche les 7 groupes de routes : `/api/auth`, `/api/users`, `/api/entreprises`,
  `/api/incidents`, `/api/epis`, `/api/audits`, `/api/dashboard`

---

### src/config/prisma.js
La **connexion à la base de données**. Crée une seule instance Prisma avec
l'adaptateur PostgreSQL, et l'exporte pour que tous les services puissent
l'utiliser sans recréer la connexion.

---

### src/middlewares/authMiddleware.js
Le **videur** de l'API. Sur chaque route protégée, il vérifie que la requête
contient un token JWT valide dans le header `Authorization: Bearer ...`.
Si non → 401. Si oui → laisse passer et attache `{ userId, role }` à `req.user`.

---

### src/controllers/authController.js
Gère la **connexion** (`POST /api/auth/login`) :
1. Valide que `email` et `password` sont présents
2. Cherche l'utilisateur par email
3. Compare le mot de passe avec bcrypt
4. Si tout est bon → génère un token JWT valable 24h et le renvoie

---

### src/routes/authRoutes.js
Déclare une seule route : `POST /login` → branchée sur la fonction `login`
du controller.

---

### src/controllers/userController.js
Gère les **4 opérations sur les utilisateurs** (pas de service — logique simple) :

| Fonction | Ce qu'elle fait |
|---|---|
| `getAllUsers` | Retourne tous les utilisateurs avec leur entreprise (password exclu) |
| `createUser` | Crée un utilisateur en hachant son mot de passe avec bcrypt |
| `updateUser` | Modifie un utilisateur (re-hache le password si fourni) |
| `deleteUser` | Supprime un utilisateur, 404 si introuvable |

---

### src/routes/userRoutes.js
Branche les 4 fonctions sur les URLs. `GET`, `PUT` et `DELETE` passent par
`protect` — un token valide est requis.

```
GET    /api/users        → protect → getAllUsers
POST   /api/users        →           createUser
PUT    /api/users/:id    → protect → updateUser
DELETE /api/users/:id    → protect → deleteUser
```

---

### src/controllers/entrepriseController.js
Gère le **CRUD complet des entreprises** — même logique que userController :
5 fonctions, réponses `{ success, data }`, erreur 404 (Prisma `P2025`),
erreur 400 si suppression d'une entreprise qui a encore des utilisateurs (Prisma FK).

---

### src/routes/entrepriseRoutes.js
Toutes les routes entreprise sont protégées par `protect` :

```
GET    /api/entreprises        → getAllEntreprises
GET    /api/entreprises/:id    → getEntrepriseById
POST   /api/entreprises        → createEntreprise
PUT    /api/entreprises/:id    → updateEntreprise
DELETE /api/entreprises/:id    → deleteEntreprise
```

---

### src/controllers/incidentsController.js + src/services/incidentService.js
Le controller gère uniquement le HTTP (statuts, req/res).
Le **service** contient toute la logique métier :
- Génération automatique de la référence `INC-2026-XXXX` (résistante aux suppressions)
- Inclusion du déclarant et du site dans les réponses

```
GET    /api/incidents        → getAllIncidents
GET    /api/incidents/:id    → getIncidentById
POST   /api/incidents        → createIncident   ← génère INC-2026-XXXX
PUT    /api/incidents/:id    → updateIncident
DELETE /api/incidents/:id    → deleteIncident
```

---

### src/controllers/epiController.js + src/services/epiService.js
Gère les **Équipements de Protection Individuelle**. Le service contient :
- CRUD standard avec inclusion du site
- Détection automatique des EPI sous le seuil de stock (`quantite <= seuilAlerte`)

```
GET    /api/epis             → getAllEpis
GET    /api/epis/alertes     → getEpisEnAlerte   ← filtre quantite <= seuilAlerte
GET    /api/epis/:id         → getEpiById
POST   /api/epis             → createEpi
PUT    /api/epis/:id         → updateEpi
DELETE /api/epis/:id         → deleteEpi
```

> ⚠️ La route `/alertes` est déclarée AVANT `/:id` dans le routeur pour ne pas
> être interprétée comme un identifiant.

---

### src/controllers/auditController.js + src/services/auditService.js
Gère les **audits internes**. Le service contient :
- Génération automatique de la référence `AUD-2026-XXXX`
- Inclusion de l'auditeur (nom, prénom) et du site dans les réponses

```
GET    /api/audits        → getAllAudits
GET    /api/audits/:id    → getAuditById
POST   /api/audits        → createAudit   ← génère AUD-2026-XXXX
PUT    /api/audits/:id    → updateAudit
DELETE /api/audits/:id    → deleteAudit
```

---

### src/controllers/dashboardController.js + src/services/dashboardService.js
Calcule les **statistiques KPI** des incidents via Prisma `groupBy` :
- Nombre total d'incidents
- Répartition par gravité (FAIBLE / MOYEN / GRAVE / CRITIQUE)
- Répartition par statut (BROUILLON / OUVERT / EN_COURS / CLOS / REJETE)
- Répartition par type (ACCIDENT / PRESQU_ACCIDENT / ...)
- Les 5 incidents les plus récents avec site et déclarant

```
GET /api/dashboard/incidents    → getIncidentStats   (protégé)
```

---

### prisma/schema.prisma
Définit la **structure complète de la base**. 6 modèles et 6 enums :

| Modèle | Table | Description |
|---|---|---|
| `Entreprise` | `entreprises` | Société cliente de CONFORYS |
| `User` | `users` | Utilisateur (ADMIN / RESPONSABLE_QHSE / EMPLOYE) |
| `Site` | `sites` | Site industriel rattaché à une entreprise |
| `Incident` | `incidents` | Incident déclaré sur un site (`INC-2026-XXXX`) |
| `Epi` | `epis` | Équipement de protection rattaché à un site |
| `Audit` | `audits` | Audit interne réalisé sur un site (`AUD-2026-XXXX`) |

Enums : `Role`, `TypeIncident`, `StatutIncident`, `GraviteIncident`, `StatutEpi`, `TypeAudit`, `StatutAudit`

---

## Architecture en 4 couches

Le projet suit une **architecture en 4 couches** :

```
CLIENT (Thunder Client / React)
           │
           ▼
       ROUTES          →  aiguillent l'URL vers la bonne fonction
           │
           ▼
    MIDDLEWARE (protect) →  vérifie le token JWT avant de laisser passer
           │
           ▼
    CONTROLLER          →  gère le HTTP : lit req.body, renvoie res.json()
           │
           ▼
      SERVICE           →  contient la logique métier (références, filtres, stats)
           │
           ▼
       PRISMA            →  traduit en requêtes SQL
           │
           ▼
      PostgreSQL
```

| Couche | Responsabilité | Exemple |
|---|---|---|
| **Routes** | Aiguillages URL → fonction | `POST /api/incidents → createIncident` |
| **Middleware** | Garde — vérifie le token | `protect` → 401 si token absent/invalide |
| **Controller** | Gestion HTTP uniquement | Lit `req.body`, renvoie `res.status(201).json(...)` |
| **Service** | Logique métier | Génère `INC-2026-0001`, filtre EPI en alerte, calcule stats |
| **Prisma** | Traduction SQL | `prisma.incident.findMany({ include: { site: true } })` |

> Les modules simples (Users, Entreprises) n'ont pas de service — leur logique
> est directement dans le controller. Les modules complexes (Incidents, EPI,
> Audits, Dashboard) délèguent au service.

---

## Comment les fichiers communiquent entre eux

### Chemin d'une requête publique — POST /api/auth/login

```
CLIENT (Thunder Client / React)
           │
           │  POST /api/auth/login
           ▼
       server.js
    (écoute le port 5000, reçoit la requête)
           │
           ▼
        app.js
    (regarde l'URL → commence par /api/auth)
           │
           ▼
    authRoutes.js
    (c'est un POST /login → appelle login)
           │
           ▼
    authController.js  ←──── config/prisma.js ←──── PostgreSQL
    (vérifie email/password,                 (requête SELECT)
     génère le token JWT)
           │
           ▼
    res.json({ token, user })  ──────────────► CLIENT
```

---

### Chemin d'une requête protégée avec service — POST /api/incidents

```
CLIENT envoie :
  POST /api/incidents
  Authorization: Bearer eyJ...
  Body: { type, gravite, description, siteId, declareParId, ... }
           │
           ▼
        app.js  →  incidentsRoutes.js
           │
           ▼
    authMiddleware.js        ← intercepte AVANT le controller
    "le token est valide ?"
         │              │
        NON             OUI
         │               │
         ▼               ▼
    401 Unauthorized   incidentsController.js
    (la requête        (extrait req.body, appelle le service)
     s'arrête ici)          │
                            ▼
                    incidentService.js          ← LOGIQUE MÉTIER
                    - genererReference()        ← INC-2026-0001
                    - prisma.incident.create()
                            │
                            ▼
                       config/prisma.js ←──── PostgreSQL
                       (INSERT en base)
                            │
                            ▼
                    res.status(201).json(...)  ──► CLIENT
```

---

### Chemin d'une requête protégée simple — GET /api/users

```
CLIENT envoie :
  GET /api/users
  Authorization: Bearer eyJ...
           │
           ▼
        app.js  →  userRoutes.js
           │
           ▼
    authMiddleware.js        ← intercepte AVANT le controller
    "le token est valide ?"
         │              │
        NON             OUI
         │               │
         ▼               ▼
    401 Unauthorized    userController.js  ←── config/prisma.js ←── PostgreSQL
    (la requête         (pas de service —         (SELECT users
     s'arrête ici)       logique simple)            + entreprise,
                               │                    password omis)
                               ▼
                    res.json({ success, data })  ──► CLIENT
```

---

### Le lien entre chaque fichier

| Fichier | Importe | Pour quoi faire |
|---|---|---|
| `server.js` | `app.js` + `prisma.js` | Démarrer le serveur et connecter la base |
| `app.js` | Les 7 fichiers `routes/` | Brancher les URLs sur les bons groupes |
| `incidentsRoutes.js` | `incidentsController.js` + `authMiddleware.js` | Aiguiller avec protection |
| `incidentsController.js` | `incidentService.js` | Déléguer la logique métier au service |
| `incidentService.js` | `prisma.js` | Générer la référence et parler à la base |
| `authController.js` | `prisma.js` + `bcrypt` + `jsonwebtoken` | Vérifier l'identité et générer le token |
| `authMiddleware.js` | `jsonwebtoken` | Vérifier le token sur chaque requête protégée |

---

### La règle de séparation des responsabilités

> **Routes** → les aiguillages (quelle URL → quelle fonction)
>
> **Middleware** → les gardes (vérifier avant de laisser passer)
>
> **Controllers** → le HTTP (lire la requête, renvoyer la réponse)
>
> **Services** → la logique métier (générer une référence, filtrer un stock, calculer des stats)
>
> **Prisma** → le traducteur (transforme le code JS en requêtes SQL)

Chaque couche ne connaît que sa voisine directe :
- `app.js` ne connaît pas les controllers, seulement les routes
- Les routes ne connaissent pas les services, seulement les controllers
- Les controllers ne connaissent pas Prisma, seulement les services
- Les services ne connaissent pas Express, seulement Prisma

---

## Route de santé

```
GET /api/status    →  vérifie que l'API tourne (non protégée)
```

Réponse :
```json
{
  "success": true,
  "message": "L'API CONFORYS fonctionne correctement.",
  "timestamp": "2026-06-12T14:00:00.000Z"
}
```

---

## Variables d'environnement requises

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | `postgresql://user:pass@localhost:5432/conforys_db` |
| `JWT_SECRET` | Clé secrète pour signer les tokens | `une_cle_longue_et_aleatoire_32+_chars` |

> **Important :** Ne jamais commiter le fichier `.env`. Utiliser une clé `JWT_SECRET`
> longue et aléatoire en production.

---

## Tester avec Thunder Client (VS Code)

### Étape 1 — Login (obtenir un token)

- Méthode : `POST`
- URL : `http://localhost:5000/api/auth/login`
- Onglet **Body** → JSON :
```json
{
  "email": "mamadou.diallo2@conforys.com",
  "password": "MotDePasse123!"
}
```
→ Copier la valeur du champ `token` dans la réponse.

### Étape 2 — Accéder à une route protégée

- Onglet **Headers** → ajouter :

| Key | Value |
|---|---|
| `Authorization` | `Bearer coller_le_token_ici` |

> Format exact : `Bearer ` (avec un espace) suivi du token. Un espace manquant ou en trop → 401.
