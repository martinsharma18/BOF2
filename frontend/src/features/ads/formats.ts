import type { AdPlacement } from '@/lib/types'

/**
 * One fixed shape per advertising space, so every ad shows completely and the feed stays tidy.
 * Images are centre-cropped to this shape if they don't match.
 */
export const adFormats: Record<AdPlacement, { ratio: number; aspectClass: string; size: string; label: string }> = {
  Banner: { ratio: 4, aspectClass: 'aspect-[4/1]', size: '1600 × 400 px', label: 'Banner (between posts) · wide 4:1' },
  Sidebar: { ratio: 1, aspectClass: 'aspect-square', size: '800 × 800 px', label: 'Square · right column on computers, between posts on phones · 1:1' },
}

export function fitsFormat(placement: AdPlacement, width: number, height: number) {
  const ratio = width / height
  return Math.abs(ratio - adFormats[placement].ratio) / adFormats[placement].ratio <= 0.1
}
