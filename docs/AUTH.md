# Authentification — CONFORYS API

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
- Branche les 3 groupes de routes : `/api/auth`, `/api/users`, `/api/entreprises`

---

### src/config/prisma.js
La **connexion à la base de données**. Crée une seule instance Prisma avec
l'adaptateur PostgreSQL, et l'exporte pour que tous les controllers puissent
l'utiliser sans recréer la connexion.

---

### src/middlewares/authMiddleware.js
Le **videur** de l'API. Sur chaque route protégée, il vérifie que la requête
contient un token JWT valide dans le header `Authorization: Bearer ...`.
Si non → 401. Si oui → laisse passer.

---

### src/controllers/authController.js
Gère la **connexion** (`POST /api/auth/login`) :
1. Cherche l'utilisateur par email
2. Compare le mot de passe avec bcrypt
3. Si tout est bon → génère un token JWT valable 24h et le renvoie

---

### src/routes/authRoutes.js
Déclare une seule route : `POST /login` → branchée sur la fonction `login`
du controller.

---

### src/controllers/userController.js
Gère les **4 opérations sur les utilisateurs** :

| Fonction | Ce qu'elle fait |
|---|---|
| `getAllUsers` | Retourne tous les utilisateurs avec leur entreprise |
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
5 fonctions, réponses `{ success, data }`, erreur 404 via le code Prisma `P2025`.

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

### prisma/schema.prisma
Définit la **structure de la base**. Deux modèles : `Entreprise` et `User`,
liés par une relation (une entreprise a plusieurs utilisateurs). Prisma génère
les requêtes SQL à partir de ce fichier.

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

### Chemin d'une requête protégée — GET /api/users

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
    (la requête         (récupère les              (SELECT users
     s'arrête ici)       utilisateurs)              + entreprise)
                               │
                               ▼
                    res.json({ success, data })  ──► CLIENT
```

---

### Le lien entre chaque fichier

| Fichier | Importe | Pour quoi faire |
|---|---|---|
| `server.js` | `app.js` + `prisma.js` | Démarrer le serveur et connecter la base |
| `app.js` | Les 3 fichiers `routes/` | Brancher les URLs sur les bons groupes |
| `userRoutes.js` | `userController.js` + `authMiddleware.js` | Dire "cette URL → cette fonction, avec ou sans protection" |
| `userController.js` | `prisma.js` + `bcrypt` | Exécuter la logique métier et parler à la base |
| `authController.js` | `prisma.js` + `bcrypt` + `jsonwebtoken` | Vérifier l'identité et générer le token |
| `authMiddleware.js` | `jsonwebtoken` | Vérifier le token sur chaque requête protégée |

---

### La règle de séparation des responsabilités

> **Routes** → les aiguillages (quelle URL → quelle fonction)
>
> **Controllers** → la logique (quoi faire avec la requête)
>
> **Middleware** → les gardes (vérifier avant de laisser passer)
>
> **Prisma** → le traducteur (transforme le code JS en requêtes SQL)

Chaque couche ne connaît que sa voisine directe :
- `app.js` ne connaît pas les controllers, seulement les routes
- Les routes ne connaissent pas Prisma, seulement les controllers
- Les controllers ne connaissent pas Express, seulement Prisma et les librairies métier
