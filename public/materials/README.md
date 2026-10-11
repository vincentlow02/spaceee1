# Material images and supplier marks

Material Library presentation fields live with each canonical profile in
`lib/materials/materials.js`. Add approved product images under this folder
and point that Registry entry's `imageSrc` at the local public URL. Store
supplier marks under `public/suppliers/` and reference them through the
supplier's `logoSrc` field.

The Oak Knotty E190 product texture and Tokyo Koei supplier SVG are official
assets downloaded from the product and corporate pages linked in its Registry
entry. Keep the corresponding source URLs alongside future materials.

The Cement 02 / EA6652K card uses the sharper material image from its [TECTURE
product variation page](https://www.tecture.jp/product_variations/190965). That
page identifies the exact model as EA6652K; `sourceUrl` remains the KMEW product
page. The KMEW SOLIDO product page provides an actual inline-use `logo.svg`,
copied to `public/suppliers/kmew-solido.svg` and used directly by the card.

The Japanese Igusa card uses the user-provided close-up photograph at
`japanese-igusa-texture.jpg`. Kouhin's [official sample product page](https://www.kouhin.com/c/sample/sample10)
remains the source link for the material.

The Jute card uses the LMT15107 product image from Wako-Dou's [Lilycolor
Materials listing](https://www.wako-dou-store.com/view/item/000000013531).
The page identifies the product as woven Jute (黄麻), manufactured by Lilycolor.

Kouhin and Lilycolor supplier marks use the original PNG wordmark assets served
by their websites. They are referenced directly from the Material Registry;
there are no SVG wrapper files pretending to be vector logos. Tokyo Koei's
official mark is an actual SVG.

Suggested filenames:

- `coke-can.png` → material ID `coke-can`
- `black-can.png` → material ID `blackcan`
- `tissue.png` → material ID `tissue`

Material Library images use a fixed crop for consistent card sizing. Composer
slot images continue to show the whole photograph with `object-fit: contain`.
When a Library image or logo is missing, the card displays a neutral fallback.

Koeido EB-02 and AL-03 are registered with verified Sekaido product dimensions,
separate reusable Library-image prompts, and distinct spatial-generation prompts.
Their Material Library assets are the user-provided sample photographs:
`koeido-eb-02.png` (White PVC) and `koeido-al-03.png` (Aluminum). No paid image
generation was run for these entries.
