import { LEGAL_ENTITY, SUPPORT_EMAIL } from '@/config/legal';

/**
 * Textes légaux affichés dans l'application (Paramètres → Informations légales).
 * Rédigés d'après ce que fait réellement l'application. À faire relire par un juriste
 * et à compléter (src/config/legal.ts) avant la publication sur les magasins d'applications.
 */

export type LegalDocId = 'confidentialite' | 'conditions';

export interface LegalDoc {
  title: string;
  intro: string;
  sections: { title: string; paragraphs: string[] }[];
}

const editor = LEGAL_ENTITY ?? 'l’équipe BoutiQ';
const contact = SUPPORT_EMAIL ? `Écrivez-nous à ${SUPPORT_EMAIL}.` : 'Écrivez-nous depuis l’application : Paramètres → Aide.';

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  confidentialite: {
    title: 'Politique de confidentialité',
    intro:
      'BoutiQ est une place de marché où des boutiques vendent leurs produits à des clients. Cette page explique quelles informations nous recueillons, pourquoi, et comment vous gardez la main dessus.',
    sections: [
      {
        title: '1. Qui est responsable de vos données',
        paragraphs: [`Vos données sont traitées par ${editor}, qui édite l’application BoutiQ. ${contact}`],
      },
      {
        title: '2. Les informations que nous recueillons',
        paragraphs: [
          'Votre compte : votre adresse e-mail ou votre numéro de téléphone, et votre mot de passe (enregistré sous forme chiffrée, que nous ne pouvons pas lire).',
          'Votre profil : votre nom, votre téléphone, votre ville, votre adresse de livraison et, si vous en ajoutez une, votre photo de profil.',
          'Si vous ouvrez une boutique : le nom, la description, la ville et le pays de la boutique, votre numéro WhatsApp, les photos de la boutique et des produits, et la pièce d’identité que vous envoyez pour la vérification.',
          'Vos commandes : les articles, les montants, le mode de paiement choisi, l’adresse de livraison et le message laissé au vendeur.',
          'Vos échanges : les messages que vous envoyez aux boutiques et ceux que vous recevez.',
          'Votre activité : vos favoris, les boutiques que vous suivez, votre panier et le nombre de visites des boutiques.',
          'BoutiQ n’encaisse pas de paiement en ligne : nous ne recueillons ni numéro de carte ni code Mobile Money.',
        ],
      },
      {
        title: '3. À quoi servent ces informations',
        paragraphs: [
          'À faire fonctionner le service : créer votre compte, afficher les boutiques, passer et suivre les commandes, vous permettre d’écrire à un vendeur.',
          'À vérifier les boutiques avant d’activer leurs ventes, pour protéger les clients.',
          'À vous prévenir de ce qui vous concerne : suivi de commande, nouveaux messages, nouveautés des boutiques que vous suivez.',
          'À assurer la sécurité du service et à traiter les signalements.',
          'Nous ne vendons pas vos données, nous ne faisons pas de publicité ciblée et nous ne vous suivons pas d’une application à l’autre.',
        ],
      },
      {
        title: '4. Avec qui elles sont partagées',
        paragraphs: [
          'Avec le vendeur, quand vous commandez : votre nom, votre téléphone, votre ville, votre adresse et votre message, pour qu’il puisse vous livrer.',
          'Avec les autres utilisateurs : ce qu’une boutique publie (nom, photos, produits, ville) est visible de tous. Votre nom est visible de la boutique à qui vous écrivez.',
          'Avec notre hébergeur, Supabase, qui stocke les données pour notre compte et les protège.',
          'Avec les autorités, uniquement lorsque la loi nous y oblige.',
        ],
      },
      {
        title: '5. Les autorisations de votre téléphone',
        paragraphs: [
          'Photos et appareil photo : seulement quand vous choisissez une photo (profil, boutique, produit, recherche par image).',
          'Notifications : seulement si vous les activez dans les Paramètres.',
          'Face ID ou empreinte : la vérification se fait dans votre téléphone. BoutiQ ne reçoit ni votre visage ni votre empreinte.',
          'Vous pouvez retirer une autorisation à tout moment dans les réglages de votre téléphone.',
        ],
      },
      {
        title: '6. Combien de temps nous les gardons',
        paragraphs: [
          'Tant que votre compte existe. Si vous supprimez votre compte, votre profil, vos favoris, vos messages, vos notifications et votre boutique sont supprimés.',
          'Les ventes déjà terminées restent dans l’historique du vendeur, sans votre nom, votre téléphone ni votre adresse.',
        ],
      },
      {
        title: '7. Vos droits',
        paragraphs: [
          'Vous pouvez consulter et corriger vos informations dans l’application (Profil, Boutique).',
          'Vous pouvez supprimer votre compte et vos données : Paramètres → Supprimer mon compte.',
          `Pour toute autre demande (copie de vos données, question, réclamation) : ${contact}`,
        ],
      },
      {
        title: '8. Sécurité',
        paragraphs: [
          'Les échanges entre l’application et nos serveurs sont chiffrés. Chaque compte n’accède qu’à ses propres commandes, messages et documents. La pièce d’identité d’un vendeur n’est lisible que par lui et par l’équipe de vérification.',
        ],
      },
      {
        title: '9. Âge',
        paragraphs: ['BoutiQ s’adresse aux personnes majeures. Un mineur ne peut l’utiliser qu’avec l’accord d’un parent ou d’un tuteur.'],
      },
      {
        title: '10. Changements',
        paragraphs: ['Si cette politique change de façon importante, nous vous préviendrons dans l’application avant que le changement s’applique.'],
      },
    ],
  },

  conditions: {
    title: 'Conditions d’utilisation',
    intro: 'En utilisant BoutiQ, vous acceptez les règles ci-dessous. Elles sont là pour que les achats et les ventes se passent bien pour tout le monde.',
    sections: [
      {
        title: '1. Le service',
        paragraphs: [
          'BoutiQ met en relation des boutiques et des clients. La vente est conclue directement entre le client et le vendeur : BoutiQ n’est pas le vendeur des produits.',
          `BoutiQ est édité par ${editor}.`,
        ],
      },
      {
        title: '2. Votre compte',
        paragraphs: [
          'Vous pouvez regarder les boutiques sans compte. Pour commander, écrire à un vendeur ou ouvrir une boutique, un compte est nécessaire.',
          'Donnez des informations exactes et gardez votre mot de passe pour vous. Vous êtes responsable de ce qui est fait depuis votre compte.',
        ],
      },
      {
        title: '3. Les boutiques',
        paragraphs: [
          'Une boutique ne peut vendre qu’après vérification de l’identité du vendeur.',
          'Le vendeur décrit ses produits honnêtement : photos réelles, prix exact, quantité disponible à jour.',
          'Le vendeur prépare et livre lui-même les commandes, dans les délais annoncés.',
          'BoutiQ prélève une commission de 5 % sur les ventes confirmées par le client.',
        ],
      },
      {
        title: '4. Commandes, paiement et livraison',
        paragraphs: [
          'Le client paie au vendeur à la livraison, en espèces ou par Mobile Money. Aucun paiement n’est encaissé dans l’application.',
          'Les frais de livraison éventuels sont convenus avec le vendeur.',
          'Le client peut annuler tant que la commande n’est pas confirmée ; le vendeur peut la refuser avant de l’expédier.',
          'À la réception, le client touche « J’ai reçu ma commande » : la vente est alors confirmée.',
          'En cas de problème avec un produit (non conforme, abîmé, non livré), contactez d’abord le vendeur par la messagerie. Si vous ne trouvez pas d’accord, écrivez-nous.',
        ],
      },
      {
        title: '5. Rabais et codes promo',
        paragraphs: ['Les rabais et les codes promo sont décidés par chaque boutique et ne valent que dans cette boutique, aux conditions qu’elle a fixées (montant minimum, durée, nombre d’utilisations).'],
      },
      {
        title: '6. Ce qui est interdit',
        paragraphs: [
          'Vendre des produits illégaux, dangereux, contrefaits ou volés.',
          'Publier des contenus trompeurs, haineux, violents ou à caractère sexuel.',
          'Harceler, menacer ou tromper un autre utilisateur, y compris par la messagerie.',
          'Utiliser l’application pour obtenir un paiement en dehors des commandes, ou détourner les coordonnées d’un client.',
        ],
      },
      {
        title: '7. Signalement et modération',
        paragraphs: [
          `Si une boutique, un produit ou un message vous semble contraire à ces règles, signalez-le. ${contact}`,
          'Nous examinons les signalements rapidement. Nous pouvons retirer un contenu, refuser ou suspendre une boutique, ou fermer un compte qui ne respecte pas ces conditions.',
        ],
      },
      {
        title: '8. Responsabilité',
        paragraphs: [
          'Chaque vendeur est responsable de ses produits, de ses prix et de ses livraisons. BoutiQ fait de son mieux pour vérifier les boutiques et garder le service disponible, sans pouvoir garantir l’absence d’interruption.',
        ],
      },
      {
        title: '9. Fermer votre compte',
        paragraphs: ['Vous pouvez supprimer votre compte à tout moment : Paramètres → Supprimer mon compte. Les commandes en cours doivent d’abord être terminées ou annulées.'],
      },
      {
        title: '10. Changements et droit applicable',
        paragraphs: [
          'Ces conditions peuvent évoluer. Nous vous préviendrons dans l’application en cas de changement important.',
          'Elles sont soumises au droit du pays où l’éditeur de BoutiQ est établi.',
        ],
      },
    ],
  },
};
