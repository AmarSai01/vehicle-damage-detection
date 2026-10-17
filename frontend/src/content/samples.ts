/**
 * One-click sample photos for the Analyzer. These are freely licensed images
 * from Wikimedia Commons (not CarDD) — keep the attribution fields accurate.
 */

export interface SampleImage {
  id: string
  label: string
  src: string
  thumb: string
  alt: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'dent',
    label: 'Dent',
    src: '/samples/dent.jpg',
    thumb: '/samples/dent-thumb.jpg',
    alt: 'White car with a crumpled, dented front bumper',
    author: 'Nyttend',
    license: 'Public domain',
    licenseUrl: null,
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Oh_deer!.jpg',
  },
  {
    id: 'scratch',
    label: 'Scratch',
    src: '/samples/scratch.jpg',
    thumb: '/samples/scratch-thumb.jpg',
    alt: 'Silver car doors with long keyed scratches in the paint',
    author: 'Athol Mullen',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:KeyedPaintOnCar.JPG',
  },
  {
    id: 'glass-shatter',
    label: 'Glass shatter',
    src: '/samples/glass-shatter.jpg',
    thumb: '/samples/glass-shatter-thumb.jpg',
    alt: 'Car windshield shattered into large broken pieces',
    author: 'Shixart1985',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Damaged_car_window_in_a_junkyard_with_broken_glass_on_the_windshield_and_rows_of_vehicles_in_the_background.jpg',
  },
  {
    id: 'lamp-broken',
    label: 'Broken lamp',
    src: '/samples/lamp-broken.jpg',
    thumb: '/samples/lamp-broken-thumb.jpg',
    alt: 'Smashed rear tail light on a dark car',
    author: 'Shixart1985',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Damaged_car_tail_light_seen_in_a_junkyard.jpg',
  },
  {
    id: 'tire-flat',
    label: 'Flat tire',
    src: '/samples/tire-flat.jpg',
    thumb: '/samples/tire-flat-thumb.jpg',
    alt: 'Flat front tire on a silver pickup truck',
    author: 'Zm05gamer',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Flat_tire_on_the_right_side_of_the_car.jpg',
  },
]
