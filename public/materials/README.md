# Product cutout photos

Add the supplied transparent product photographs here, then set the matching
`imageSrc` in `features/materials/materialPresentation.js`.

Suggested filenames:

- `coke-can.png` → material ID `coke-can`
- `black-can.png` → material ID `blackcan`
- `tissue.png` → material ID `tissue`

Use transparent PNG or WebP. The UI shows the whole photograph with
`object-fit: contain`, and displays it only after the position is recognized.
Until a photograph is supplied, a neutral photo placeholder is shown.
