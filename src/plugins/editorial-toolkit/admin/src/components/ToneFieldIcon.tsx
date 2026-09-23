import * as React from 'react';

/*
 * Icon shown in the Content-Type Builder. Core attribute icons are 32x32 "symbols"
 * (light 31x23 tile with a border and a coloured glyph, stretched by the builder with
 * `svg { width: 100% }`),
 * so this one follows the same recipe to sit next to them without standing out.
 * The glyph is the `Palette` path of @strapi/icons, scaled into the tile.
 */
const PALETTE_PATH =
  'M25.096 6.736A12.9 12.9 0 0 0 16 3h-.134A13 13 0 0 0 3 16c0 5.375 3.323 9.883 8.67 11.771A4 4 0 0 0 17 24a2 2 0 0 1 2-2h5.776a3.976 3.976 0 0 0 3.9-3.11c.224-.984.332-1.99.324-3a12.9 12.9 0 0 0-3.904-9.154M10.5 21a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m0-7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5.5-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3';

export const ToneFieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={16} height={16} {...props}>
    <rect width={31} height={23} x={0.5} y={4.5} fill="#FDF4DC" stroke="#FAE7B9" rx={2.5} />
    <path fill="#BE5D01" transform="translate(9 9) scale(0.4375)" d={PALETTE_PATH} />
  </svg>
);
