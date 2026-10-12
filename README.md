# Poster Archive

## Démarrer le site et son administration

Python 3.9 ou plus récent suffit pour le serveur local, sans dépendance supplémentaire. Le mot de passe local est lu depuis `.env`, exclu du déploiement et du suivi Git.

```sh
export POSTER_ADMIN_PASSWORD='remplacez-ceci-par-un-mot-de-passe-personnel'
python3 server.py
```

- Archive : http://127.0.0.1:8000
- Administration : http://127.0.0.1:8000/admin
- Identifiant : `admin` ; mot de passe : celui choisi ci-dessus.

L’administration permet d’ajouter un nom, une date et une image PNG, JPEG ou WebP (10 Mo maximum), avec aperçu. Les ajouts sont visibles dans l’archive après actualisation. Les cinq affiches existantes sont conservées ; leur date reste « 2025 », faute de date exacte connue.

Les données sont conservées dans `data/posters.sqlite3` et `data/uploads/`. Sauvegarder tout le dossier `data/`. Le dossier de stockage peut être déplacé avec `POSTER_DATA_DIR`.

## Hébergement

Le site doit être servi par `server.py` pour que les ajouts fonctionnent : un hébergement purement statique ne suffit pas. Pour une mise en ligne, utiliser un hébergement Python avec un disque persistant, derrière un reverse proxy HTTPS (nécessaire pour protéger le mot de passe). Configurer `POSTER_ADMIN_PASSWORD` dans les variables d’environnement de l’hébergeur. `HOST` et `PORT` sont configurables ; le proxy doit préserver l’en-tête `Host` et l’origine publique des requêtes.

Ouvrir uniquement `index.html` conserve les affiches initiales, sans administration.

## Migration vers Vercel

La version actuelle tourne sur le serveur local. Ne pas la publier telle quelle sur Vercel : SQLite et le dossier local des images nécessitent un stockage persistant, absent des fonctions Vercel. L’adaptation prévue utilisera Vercel Blob pour les images et un stockage persistant pour les informations des posters. Il faudra également adapter les envois à la limite de 4,5 Mo des fonctions (envoi direct à Blob pour les images volumineuses).

Le fichier `.vercelignore` exclut les secrets locaux et la base locale des déploiements. Configurer le mot de passe via `POSTER_ADMIN_PASSWORD` dans le projet Vercel. Migrer explicitement les posters ajoutés localement avant la mise en ligne ; ils ne sont pas automatiquement transférés.
