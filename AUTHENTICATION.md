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
La réinitialisation du mot de passe invalide toutes les sessions via la vérification existante de `passwordVersion`.

## Vérification des adresses email

Les nouveaux comptes doivent vérifier leur email avant de se connecter. La migration
`20261123120000_add_email_verification` marque uniquement les comptes déjà présents
comme vérifiés, pour conserver leurs accès et leurs sessions. Il n’y a aucun défaut
« vérifié » pour les nouvelles inscriptions. `isActif` reste indépendant.

- Configurer `BREVO_API_KEY` et `EMAIL_FROM` côté serveur. `EMAIL_FROM` accepte une
  adresse simple ou `Animalerie Khalil <adresse@domaine.tn>` ; l’expéditeur doit être
  autorisé dans Brevo. Aucun SDK ni relais SMTP supplémentaire n’est nécessaire.
- Configurer `APP_URL=https://votre-domaine.tn` en production (origine HTTPS sans
  chemin). En développement, l’origine par défaut est `http://localhost:3000`.
  Aucune de ces variables ne doit être préfixée par `NEXT_PUBLIC_`.
- Le lien vers `/verifier-email#token=...` contient 32 octets aléatoires. Son fragment
  n’est pas envoyé au serveur et est retiré de la barre d’adresse après lecture.
  Le clic sur le bouton confirme explicitement l’adresse par `POST /api/auth/verify-email`.
  Une ouverture GET seule ne consomme pas le lien.
- Seule l’empreinte SHA-256 est conservée. Le lien expire après 24 heures ; sa
  consommation est atomique et unique. Un renvoi invalide le lien précédent.
- `POST /api/auth/resend-verification` reçoit uniquement `{ "email": "..." }`.
  La base impose une minute entre deux envois et cinq tentatives par heure et
  par compte. La limite existante en mémoire complète cette protection.
- Si Brevo échoue à l’inscription, le compte reste créé (`201`, `emailSent: false`).
  Le client reçoit un message et peut demander un nouveau lien sans se réinscrire.
  Une réponse positive de Brevo indique l’acceptation de l’envoi, pas sa livraison.
- Un changement d’adresse via le profil ou l’admin remet la vérification à zéro
  et invalide l’ancien lien. Le client demande ensuite un lien pour sa nouvelle
  adresse depuis `/verifier-email`. Une simple modification de casse ne la remet pas à zéro.

Validation manuelle : inscrire une adresse de test contrôlée, constater le refus de
connexion avant vérification, ouvrir le lien reçu et confirmer, puis se connecter.
Réutiliser le lien doit échouer ; après un renvoi, seul le nouveau fonctionne.
Vérifier également les expirations et les réponses `429`, ainsi que la connexion
d’un compte présent avant la migration. Ne jamais partager ou journaliser les jetons.

## Mot de passe oublié

- Depuis `/connexion`, le lien « Mot de passe oublié ? » ouvre `/mot-de-passe-oublie`.
  La même page affiche le formulaire de nouveau mot de passe quand le lien email
  contient `#token=...`. Le fragment est retiré après lecture et n’est pas stocké localement.
- `POST /api/auth/forgot-password` reçoit `{ "email": "..." }` et retourne `202`
  avec le même message pour une adresse inconnue, inactive, limitée ou un échec Brevo.
  Les erreurs de livraison sont signalées côté serveur sans adresse ni jeton.
- Le service Brevo existant utilise les mêmes variables `BREVO_API_KEY`, `EMAIL_FROM`
  et `APP_URL`. Aucun paramétrage ou paquet supplémentaire n’est nécessaire.
- Le jeton contient 32 octets aléatoires ; seule son empreinte SHA-256 est stockée.
  Il expire après 30 minutes. Un nouvel envoi invalide le précédent.
- La base limite les envois à un par minute et cinq par heure par compte, même
  entre plusieurs instances. Le limiteur existant en mémoire complète cette protection
  avec dix demandes par adresse/opération toutes les 15 minutes (`429`).
- `POST /api/auth/reset-password` reçoit `{ "token": "...", "password": "..." }`.
  Le mot de passe doit contenir au moins huit caractères et au maximum 72 octets UTF-8.
  Il est haché avec bcrypt (coût 12). La modification et la consommation du jeton
  s’effectuent dans une seule mise à jour conditionnelle, y compris en cas de concurrence.
- La réinitialisation ne connecte pas le client et ne vérifie pas son adresse email.
  Le cookie courant est supprimé ; toutes les autres sessions sont refusées dès
  leur prochaine requête authentifiée. Un changement d’adresse invalide aussi le jeton.
- La migration `20261123140000_add_password_reset` ajoute seulement des champs
  optionnels et un compteur à zéro ; les comptes existants conservent leur accès.

Validation manuelle : demander un lien avec une adresse contrôlée puis avec une
adresse inconnue (même réponse). Vérifier le délai entre envois, la confirmation des
mots de passe, le nouveau mot de passe à la connexion et le refus d’une session ouverte
avant la réinitialisation. Réutiliser un lien ou utiliser un lien expiré doit échouer.
Après un renvoi, seul le nouveau lien doit fonctionner.

## Notification administrateur des nouvelles commandes

- Après la transaction réussie de `POST /api/orders`, `after()` lance l’envoi
  via `sendEmail()` vers `khalil.animalerie@gmail.com`. Le client reçoit sa confirmation
  sans attendre Brevo. Les reprises idempotentes du checkout ne déclenchent aucun envoi.
- La migration `20261123160000_add_order_email_notification` ajoute un état persistant
  et des dates de suivi. Les anciennes commandes sont `SKIPPED`, les nouvelles `PENDING`.
- Dans `/admin/commandes`, ouvrir les détails puis « Actualiser / réessayer l’envoi ».
  Cette action utilise `POST /api/orders/[id]` avec `{ "action": "retry-notification" }`,
  réservé aux administrateurs et protégé contre les origines étrangères.
- Une réservation atomique en base empêche les envois concurrents. Les reprises
  attendent au moins une minute. `SENT` signifie accepté par Brevo, pas livré en boîte.
- La même clé UUID est transmise dans `headers.idempotencyKey` à Brevo pour chaque
  notification. Si une réponse réseau ou un arrêt du serveur rend l’envoi incertain,
  les reprises sont autorisées uniquement pendant dix minutes après le premier essai,
  dans la fenêtre de déduplication du fournisseur. Ensuite, l’état reste `UNKNOWN` :
  vérifier les journaux Brevo avant toute intervention, sans renvoyer aveuglément.
  Un refus explicite (`FAILED`) peut être retenté après correction de la configuration.
- Si le processus s’arrête avant le travail différé, la commande reste `PENDING`
  et l’administrateur peut lancer la reprise. Aucun cron ou service payant ajouté.
- Le contenu HTML échappe les données du client et utilise les articles/prix figés
  de la commande ; une version texte est également envoyée. Aucun détail personnel
  ou contenu de réponse Brevo n’est journalisé.

Validation : créer une commande contrôlée, vérifier sa présence en base et l’email
dans Brevo. Rejouer la même clé de commande ne doit pas envoyer de deuxième notification.
Simuler un refus Brevo, constater la conservation de la commande puis réessayer depuis
ses détails admin. Tester deux reprises simultanées et le refus de l’action pour un client.
