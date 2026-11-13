import { PixelRatio } from 'react-native';

/**
 * URL d'image adaptée à la taille d'affichage réelle (pixels physiques),
 * arrondie par paliers de 120 px pour maximiser les hits du cache disque.
 */
export function photoUrl(photoId: string, displayWidth: number, aspect?: number, focus?: { x: number; y: number; zoom: number }): string {
  const ratio = Math.min(PixelRatio.get(), 3);
  const w = Math.ceil((displayWidth * ratio) / 120) * 120;
  const params = [`w=${w}`, 'q=72', 'auto=format', 'fit=crop'];
  if (aspect) params.push(`h=${Math.round(w * aspect)}`);
  // Vue rapprochée : même photo, recadrée autour d'un point.
  if (focus) params.push('crop=focalpoint', `fp-x=${focus.x}`, `fp-y=${focus.y}`, `fp-z=${focus.zoom}`);
  return `https://images.unsplash.com/photo-${photoId}?${params.join('&')}`;
}

/**
 * Photos d'un article d'exemple : la vue d'ensemble, puis deux vues rapprochées de la même
 * photo (les vrais articles montrent les photos choisies par le vendeur).
 */
export function demoGallery(photoId: string, width: number, aspect: number): string[] {
  return [
    photoUrl(photoId, width, aspect),
    photoUrl(photoId, width, aspect, { x: 0.5, y: 0.45, zoom: 1.8 }),
    photoUrl(photoId, width, aspect, { x: 0.35, y: 0.6, zoom: 2.4 }),
  ];
}

/** Photo d'un produit : image locale du vendeur, sinon photo de démo dimensionnée. */
export function productImageUri(p: { imageUri?: string; photoId: string; aspect: number }, width: number, aspect?: number): string {
  return p.imageUri ?? photoUrl(p.photoId, width, aspect ?? p.aspect);
}

/** Bannière d'une boutique (image du vendeur ou photo de démo). */
export function storeBannerUri(s: { bannerUri?: string; bannerPhotoId?: string }, width: number, aspect: number): string | undefined {
  if (s.bannerUri) return s.bannerUri;
  return s.bannerPhotoId ? photoUrl(s.bannerPhotoId, width, aspect) : undefined;
}
