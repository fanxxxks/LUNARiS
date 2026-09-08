# Offline interface fonts

The HTML embeds subset WOFF2 files. It does not request fonts from a CDN at runtime.

- [Source Han Serif SC Bold](https://github.com/adobe-fonts/source-han-serif), renamed to **Lunaris Serif** for the UI subset. Weight 700. License: `SourceHanSerif-OFL.txt`.
- **Novecento Wide Bold** is the requested English face. The build currently checks local installed names, but no matching local font or project Webfont has been found. English therefore currently renders in **Space Grotesk Bold**, named **Lunaris Display** in the subset. License: `SpaceGrotesk-OFL.txt`.
- To embed the supplied Novecento Webfont, place it at `vendor/fonts/novecento-wide-bold.woff2` and rebuild. The build preserves that font unchanged. Use the Webfont distribution from [Synthview](https://typography.synthview.com/novecento-sans-font-family.php); the desktop distribution is a separate product.
- Old Noto Sans SC files remain available for the prior UI backup and are not embedded in the current build.

The available upstream sources are retained in `sources/`. SHA-256 hashes, character coverage and output sizes are recorded in `build-report.json`.

Run `python build-fonts.py` after changing UI text, then `node build-simulation.cjs`. Font building requires `fonttools` and `brotli`; rebuilding the page from the supplied WOFF2 files requires only Node.js. Font license and copyright notices are also embedded in the single-file HTML.
