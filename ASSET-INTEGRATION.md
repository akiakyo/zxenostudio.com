# Asset integration

- Portfolio: 20 original PNG images from the supplied Drive folder, grouped into 3D VFX (7), iPhone (5), JBL Headset (4), Sauvage Dior (4). Stored in `public/media/portfolio/`; displayed as four galleries on `/work`.
- Six supplied website icons: `public/assets/icons/icon-1.png` through `icon-6.png`, used on the How we work cards.
- Service cutouts: `public/media/services/graphic-design-cutout.png`, `merchandise-cutout.png`, `motion-cutout.png`, `web-cutout.png`.
- Background removal used the built-in image generation tool. Prompt set: remove only each illustration's backdrop, preserve foreground objects, software logos, product branding, composition and colors, and output actual alpha transparency with no painted checkerboard. Two initial outputs were rejected because their backgrounds were opaque; replacement PNGs were verified for transparency. Original JPEGs are retained. Generated cutouts may vary in fine details from the originals.
- Service interaction uses perspective tilt on the cutout images, with pointer, touch, arrow keys and Home reset. These are image effects, not freely rotatable 3D models. Reduced-motion preference disables tilt.
- Shared footer contains only existing routes, supplied studio contact details and service links. No unprovided social profiles, payment claims or policy pages were invented.

Validation: `npm run build`; `npx playwright test tests/assets.spec.ts tests/multipage.spec.ts`.
