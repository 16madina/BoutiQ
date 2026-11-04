/**
 * Pictogramme d'un rayon à partir de son nom (« Robes » → 👗).
 * Les émojis donnent le rendu illustré des maquettes ; sans correspondance,
 * la vitrine affiche la photo du premier produit du rayon.
 */
import { normalize } from '@/utils/format';

const EMOJI_RULES: [RegExp, string][] = [
  [/robe|soiree|ceremon/, '👗'],
  [/wax|pagne|boubou|tenue/, '👘'],
  [/sac|maroquin|cabas/, '👜'],
  [/basket|sneaker|sport/, '👟'],
  [/chaussure|escarpin|talon/, '👠'],
  [/bijou|collier|bague|creole/, '💍'],
  [/lunette|accessoire/, '🕶️'],
  [/montre|watch/, '⌚'],
  [/homme|chemise|costume/, '👔'],
  [/enfant|bebe|jouet/, '🧸'],
  [/t-?shirt|vetement|^mode$|haut/, '👕'],
  [/parfum/, '🌸'],
  [/visage|soin|creme/, '🧴'],
  [/corps|bain|savon/, '🧼'],
  [/cheveu|coiff|perruque|meche/, '💇🏾‍♀️'],
  [/maquillage|beaute|rouge/, '💄'],
  [/coffret|cadeau/, '🎁'],
  [/fruit/, '🍌'],
  [/legume/, '🥬'],
  [/epicerie|riz|cereale/, '🛒'],
  [/boisson|jus/, '🧃'],
  [/boulang|pain|patiss/, '🥖'],
  [/viande|boucher/, '🥩'],
  [/poisson|mer/, '🐟'],
  [/panier/, '🧺'],
  [/alimentation|courses/, '🧺'],
  [/epice/, '🌶️'],
  [/smartphone|telephone|mobile/, '📱'],
  [/ordinateur|laptop|pc/, '💻'],
  [/audio|ecouteur|casque|enceinte/, '🎧'],
  [/gaming|jeu|console/, '🎮'],
  [/tv|televis|ecran/, '📺'],
  [/photo|camera/, '📷'],
  [/gadget|electronique/, '🔌'],
  [/maison|salon|canape|meuble/, '🛋️'],
  [/deco|plante/, '🪴'],
  [/cuisine|ustensile/, '🍳'],
  [/lumin|lampe/, '💡'],
  [/nouveau|nouvelle/, '✨'],
  [/promo|petit prix|solde/, '🏷️'],
  [/autre|divers/, '🧩'],
];

export function collectionEmoji(name: string): string | undefined {
  const n = normalize(name);
  return EMOJI_RULES.find(([re]) => re.test(n))?.[1];
}
