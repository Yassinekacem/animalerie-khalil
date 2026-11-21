import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileText, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions d’utilisation | Animalerie Khalil",
  description: "Les conditions d’utilisation et les informations sur les commandes, la livraison et la confidentialité sur Animalerie Khalil.",
};

const sections = [
  {
    id: "objet",
    title: "Objet et acceptation",
    paragraphs: [
      "Animalerie Khalil propose un catalogue d’alimentation et d’accessoires pour animaux, ainsi que des services de commande et de suivi en Tunisie. Ces conditions expliquent les règles d’utilisation du site et les principales informations relatives à vos achats.",
      "En créant un compte, vous acceptez ces conditions. Elles ne limitent pas les droits qui vous sont reconnus par la législation tunisienne. Vous pouvez les consulter librement avant de vous inscrire ou de commander.",
    ],
  },
  {
    id: "compte",
    title: "Compte et accès au site",
    paragraphs: [
      "Le catalogue est accessible sans compte. Vous pouvez commander en tant qu’invité ou utiliser un compte pour retrouver vos commandes et vos favoris. Fournissez des informations exactes et maintenez vos coordonnées à jour pour permettre le traitement de vos demandes.",
      "Gardez votre mot de passe confidentiel et signalez tout accès suspect. N’utilisez pas le compte d’un tiers et ne tentez pas de contourner les protections du site. En cas d’utilisation frauduleuse ou abusive, l’accès peut être restreint, sans préjudice des droits relatifs aux commandes déjà passées.",
    ],
  },
  {
    id: "produits",
    title: "Produits et disponibilité",
    paragraphs: [
      "Consultez la description, les caractéristiques, le prix et le conditionnement avant tout achat. Les photographies illustrent les produits ; l’emballage peut évoluer sans que cela ne supprime votre droit de recevoir un produit conforme à sa description.",
      "Seuls les produits indiqués « Disponible » peuvent être ajoutés au panier et commandés. Les statuts « En arrivage » et « Rupture de stock » ne permettent pas de commander. Un panier ne constitue pas une réservation de stock et la disponibilité est vérifiée lors de la commande.",
      "Les conseils du site sont des informations générales et ne remplacent pas l’avis d’un vétérinaire. Respectez les instructions du fabricant et les besoins de votre animal.",
    ],
  },
  {
    id: "commandes",
    title: "Prix, commande et paiement",
    paragraphs: [
      "Les prix sont exprimés en dinars tunisiens (TND). Les promotions apparaissent sur les produits concernés et les frais de livraison sont affichés dans le récapitulatif avant l’envoi de la commande. Les prix sont revérifiés par le serveur lors de l’enregistrement ; vérifiez le montant figurant sur votre confirmation et contactez-nous en cas d’écart.",
      "Avant de valider, vérifiez les articles, les quantités, le téléphone et l’adresse de livraison. La confirmation fournit une référence à conserver. Une commande enregistrée apparaît d’abord en attente ; son traitement et les modalités de paiement sont précisés avec Animalerie Khalil. Le site ne propose actuellement pas de saisie de carte bancaire.",
      "Vous pouvez demander un récapitulatif de votre commande ou une facture en nous contactant avec votre référence.",
    ],
  },
  {
    id: "livraison",
    title: "Livraison et réception",
    paragraphs: [
      "Les commandes prévoient une adresse en Tunisie, avec gouvernorat et ville. La desserte de votre adresse et le délai de livraison doivent être confirmés avec Animalerie Khalil ; la présence d’une ville dans le formulaire ne garantit pas à elle seule sa desserte.",
      "En cas d’erreur d’adresse, de retard ou d’indisponibilité après commande, contactez-nous pour convenir de la suite. Aucun remplacement de produit ne doit vous être imposé sans votre accord. À réception, vérifiez les articles et signalez tout dommage, article manquant ou défaut, sans que cette vérification ne limite vos droits légaux.",
    ],
  },
  {
    id: "annulation-retours",
    title: "Annulation, rétractation et réclamations",
    paragraphs: [
      "Depuis votre compte, vous pouvez annuler une commande qui vous appartient tant qu’elle est en attente. Pour une commande invitée ou déjà confirmée, contactez-nous avec sa référence. L’absence de bouton d’annulation ne supprime pas un droit légal de rétractation.",
      "Pour les achats à distance concernés, la loi tunisienne n° 2000-83 prévoit un délai de rétractation de dix jours ouvrables à compter de la réception des marchandises, sous réserve des exceptions légales. Contactez-nous pour organiser le retour. Les frais de retour liés à une simple rétractation sont à la charge du consommateur ; le remboursement intervient dans les dix jours ouvrables suivant le retour, dans les conditions prévues par la loi.",
      "Un produit non conforme ou défectueux relève des garanties et recours applicables, indépendamment d’un simple changement d’avis. Décrivez le problème et conservez les éléments utiles à son examen. Aucune disposition de ces conditions n’exclut vos garanties légales.",
    ],
  },
  {
    id: "confidentialite",
    title: "Données personnelles et confidentialité",
    paragraphs: [
      "Le fonctionnement du site utilise notamment vos coordonnées, vos commandes et, si vous avez un compte, vos informations de profil, favoris et avis. Ces données servent à gérer votre compte, traiter vos commandes, permettre leur suivi et répondre à vos demandes. Évitez de publier des coordonnées privées dans les avis, qui sont visibles publiquement.",
      "Un cookie permet de maintenir votre session et le stockage local de votre navigateur conserve votre panier. Vous pouvez les supprimer depuis les réglages du navigateur ; cela peut vous déconnecter ou effacer le panier. Des prestataires techniques interviennent pour l’hébergement et les images ; des services externes comme WhatsApp appliquent leurs propres règles lorsque vous les utilisez.",
      "Conformément au cadre tunisien de protection des données personnelles, vous pouvez demander l’accès à vos données, leur rectification et, lorsque les conditions légales sont réunies, leur effacement. Contactez Animalerie Khalil pour exercer vos droits ou connaître les destinataires et les modalités de conservation applicables. Certaines informations de commande peuvent devoir être conservées pour répondre aux obligations légales.",
    ],
  },
  {
    id: "avis-contenus",
    title: "Avis et utilisation des contenus",
    paragraphs: [
      "Les avis doivent refléter votre expérience et rester respectueux. Les contenus frauduleux, publicitaires, illicites ou portant atteinte à autrui sont interdits. Vous pouvez modifier ou supprimer vos propres avis depuis la fiche produit et signaler un contenu en nous contactant.",
      "Les textes, photographies, logos et autres contenus restent protégés par les droits de leurs titulaires. Leur consultation ne vous autorise pas à les réutiliser commercialement sans autorisation.",
    ],
  },
  {
    id: "droit-applicable",
    title: "Évolution des conditions et droit applicable",
    paragraphs: [
      "Le site peut être temporairement indisponible pour maintenance ou en cas d’incident. Signalez-nous tout problème rencontré afin que nous puissions vous aider. Ces conditions n’écartent pas la responsabilité que la loi met à la charge d’Animalerie Khalil.",
      "Les mises à jour sont publiées sur cette page. Une modification ne change pas rétroactivement les conditions d’une commande déjà conclue. Le droit tunisien s’applique. En cas de désaccord, contactez-nous pour rechercher une solution amiable ; vos voies de recours devant les autorités et juridictions compétentes restent ouvertes.",
    ],
  },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F7F8F6] text-gray-900">
      <header className="bg-[#010101] px-5 py-12 text-white sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">

          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">Conditions d’utilisation</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">Les informations essentielles pour utiliser notre site et commander en toute clarté.</p>
          <p className="mt-5 text-xs text-gray-400">Dernière mise à jour : <time dateTime="2026-11-21">21 novembre 2026</time></p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-12 lg:px-8">
        <Link href="/inscription" className={`mb-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-gray-600 hover:text-black ${focus}`}>
          <ArrowLeft size={17} aria-hidden="true" /> Retour à l’inscription
        </Link>
        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <nav aria-label="Sommaire des conditions" className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 lg:sticky lg:top-28">
            <h2 className="mb-4 text-sm font-bold">Sur cette page</h2>
            <ol className="space-y-3 text-sm">
              {sections.map((section, index) => <li key={section.id}>
                <a href={`#${section.id}`} className={`block rounded leading-6 text-gray-600 hover:text-[#438F00] ${focus}`}>{index + 1}. {section.title}</a>
              </li>)}
              <li><a href="#contact" className={`block rounded text-gray-600 hover:text-[#438F00] ${focus}`}>10. Nous contacter</a></li>
            </ol>
          </nav>

          <article aria-label="Conditions d’utilisation et confidentialité" className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-8 lg:p-10">
            <div className="space-y-8 sm:space-y-10">
              {sections.map((section, index) => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-28">
                <h2 id={`${section.id}-title`} className="text-lg font-extrabold sm:text-xl">{index + 1}. {section.title}</h2>
                <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600 [overflow-wrap:anywhere]">
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>)}

              <section id="contact" aria-labelledby="contact-title" className="scroll-mt-28 rounded-xl border border-[#65D900]/20 bg-[#65D900]/5 p-5 sm:p-6">
                <h2 id="contact-title" className="text-lg font-extrabold sm:text-xl">10. Nous contacter</h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">Pour une question sur ces conditions, une commande ou vos données personnelles, contactez Animalerie Khalil. Pour une commande, indiquez sa référence ; ne communiquez jamais votre mot de passe.</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a href="tel:+21696766945" className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#65D900] px-4 py-3 text-sm font-bold text-black hover:bg-[#55BD00] ${focus}`}><Phone size={16} aria-hidden="true" /> +216 96 766 945</a>
                  <a href="https://wa.me/21696766945" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold hover:border-[#65D900] ${focus}`}>WhatsApp <span className="sr-only">(nouvel onglet)</span><ArrowUpRight size={16} aria-hidden="true" /></a>
                </div>
              </section>
            </div>


          </article>
        </div>
      </div>
    </div>
  );
}
