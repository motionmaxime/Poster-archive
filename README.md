# Poster Archive

## Vercel

Le dépôt est configuré pour Vercel : site statique dans `public/`, fonctions Node dans `api/`, administration protégée à `/admin`. Le serveur Python sert uniquement au développement local.

### Réglages du projet

1. Lier le dépôt GitHub `motionmaxime/Poster-archive`, branche `main`.
2. Framework : **Other**. Les commandes sont définies dans `vercel.json` : `npm run build`, dossier de sortie `public`. Supprimer tout ancien remplacement manuel incompatible de ces réglages.
3. Dans **Settings → Environment Variables**, ajouter `POSTER_ADMIN_PASSWORD` (Production et Preview). L’identifiant est `admin`.
4. Dans **Storage**, créer un **Vercel Blob public**, le connecter au projet pour Production et Preview. Vérifier que `BLOB_READ_WRITE_TOKEN` est ajouté aux variables.
5. Redéployer après avoir ajouté ou modifié les variables.

Les secrets restent dans Vercel, jamais dans le dépôt. `.env` est réservé au local. Tant que Blob n’est pas connecté, le site affiche les six posters déjà présents et l’administration explique le réglage manquant. Si le mot de passe manque, `/admin` affiche une erreur de configuration et refuse l’accès.

### Stockage des nouveaux posters

Les images sont envoyées directement du navigateur vers Blob, après authentification, avec une limite de 10 Mo. Elles ne traversent pas les fonctions Vercel, dont la taille des requêtes est limitée. Formats acceptés : PNG, JPEG, WebP. Le nom et la date sont encodés dans le chemin de chaque image ; aucun catalogue partagé ne risque d’être écrasé lors de deux ajouts simultanés. Les images du stockage public sont accessibles aux visiteurs du site.

Les cinq affiches initiales et le poster « Free » ajouté localement sont inclus dans `lib/seeds.json`, `img/` et `published-uploads/`. Le dossier `data/` n’est jamais déployé. Les futurs ajouts locaux au serveur Python ne sont pas automatiquement synchronisés avec Vercel : utiliser l’administration en ligne après le déploiement.

### Vérification

```sh
npm ci
npm run build
npm test
```

La page publique attend au maximum six secondes l’API, puis utilise le catalogue statique de secours. Les fichiers de l’administration sont assemblés sans embarquer les variables secrètes.

## Serveur local Python

```sh
python3 server.py
```

Le mot de passe est lu depuis `.env` (`POSTER_ADMIN_PASSWORD=...`) ou depuis la variable d’environnement du même nom. Python 3.9 ou plus récent suffit.

- Site : http://127.0.0.1:8000
- Administration : http://127.0.0.1:8000/admin
- Identifiant : `admin`

Les ajouts locaux restent dans `data/posters.sqlite3` et `data/uploads/`. Sauvegarder tout le dossier `data/`.
