# Authentification

Les formulaires utilisent `/api/auth/register`, `/api/auth/login`, `/api/auth/session` et `/api/auth/logout`.
L’inscription crée exclusivement un compte CLIENT. Les sessions sont chiffrées dans un cookie HttpOnly, SameSite=Lax et Secure en production (HTTPS requis).

## Configuration

Définir `SESSION_PASSWORD` côté serveur : une valeur aléatoire d’au moins 32 caractères, jamais préfixée par `NEXT_PUBLIC_` ni ajoutée au dépôt. Une valeur a été générée dans le `.env` local.
Pour générer une autre valeur :

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Conserver la même valeur sur les instances d’un déploiement. La changer invalide les sessions existantes.
Sans « Se souvenir de moi », le cookie est un cookie de session navigateur et l’authentification expire après 8 heures maximum. Avec cette option, la durée maximale est de 30 jours.
Le serveur relit l’utilisateur : suppression, désactivation ou changement du mot de passe invalident l’accès ; un changement de rôle s’applique à la requête suivante.

## Premier administrateur

1. Inscrire son propre compte sur `/inscription`.
2. Depuis le projet, avec la connexion Neon configurée, exécuter :

```sh
npm run admin:promote -- votre-adresse@example.com
```

3. Se connecter sur `/connexion`. Le compte ADMIN ouvre `/admin`.

La commande locale promeut uniquement un compte actif existant et conserve son mot de passe. Elle ne s’exécute jamais au démarrage. Aucun mot de passe administrateur par défaut n’est créé.

## Accès

- Catalogue et détails produit : publics.
- Création d’une commande et consultation des frais : publiques. Le serveur associe le compte de la session ; le parcours invité conserve `userId: null`.
- `/compte/profil` et `/compte/commandes` : session active requise, avec protection serveur et contrôle de session côté client.
- `GET/PUT /api/users/me` : profil du compte de la session uniquement. Seuls le nom, l’e-mail, le téléphone et le sexe sont modifiables ; `updatedAt` protège contre les modifications concurrentes.
- `GET /api/orders?scope=mine` et `GET /api/orders/[id]?scope=mine` : commandes du compte de la session uniquement, y compris pour un administrateur. Les commandes visiteurs ne sont pas rattachées par e-mail.
- Création, modification et suppression de produits : ADMIN actif.
- Liste générale des commandes et changement de statut : ADMIN actif. Un client peut consulter le détail de sa propre commande ; un administrateur peut consulter toutes les commandes hors du mode `scope=mine`.
- Toutes les pages `/admin` : ADMIN actif, avec vérification serveur et API indépendante.

Les erreurs API utilisent `error` et éventuellement les `issues` Zod. Les lectures de session ne sont pas mises en cache. Les mutations refusent les origines étrangères ; Postman peut envoyer du JSON sans en-tête Origin.

## Limites

La limitation à 10 tentatives par adresse/opération et par tranche de 15 minutes est en mémoire, par processus. Pour plusieurs instances, la compléter par une limitation partagée au niveau de l’hébergement.
La déconnexion efface le cookie du navigateur ; une copie préalablement volée d’un cookie reste valable jusqu’à expiration ou invalidation du compte/mot de passe/secret serveur.
La réinitialisation du mot de passe et les emails de vérification ne sont pas encore implémentés.
