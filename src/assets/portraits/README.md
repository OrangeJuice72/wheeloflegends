# Portrait art organization

Store character portraits inside the folder for their universe and name each file
after the character id. Examples:

- `dc/superman.png`
- `star-wars/darth-vader.png`
- `mario/luigi.png`
- `toons/danny-phantom.png`
- `anime/naruto.png`

Character ids and universe values are defined in `src/data/characters.ts`. Portraits
are bundled automatically and used on cards everywhere: roster, wheel reveal,
formation, and battle.

- Recommended size: about 276×216 (2× the card window) or larger.
- Images are cover-fitted and cropped to the card window.
- No code changes are needed; the loader recursively scans every universe folder.
- Characters without an image keep their procedural emblem portrait.
