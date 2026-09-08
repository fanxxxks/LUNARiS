# Room reference implementation · 2026-09-08

All eight source PNGs in the sibling 房间模型图 folder were visually inspected.

Delivered eight equipment variants in the existing simulation: HAB / LSU / PWR / BIO / MED / ENG / DCU / CMD. Reference elements include grey armored shell, octagonal door surround, black corner guards, split white light bars, horizontal glazing, flush roof cover, vents, subtle fasteners, and differentiated interior geometry. The original two internal decks, clear cross passages, six port anchors and 24 room identities remain intact.

Reference single-storey imagery is adapted to the existing two-deck envelope, not a pixel-exact or photorealistic reproduction. Existing six simulation function groups remain separate from eight visual subtypes. The UI identifies both the original function and the visual subtype.

## Checks

- `node simulation-test.cjs`: passed, including 1,000 legal moves and continuous room conservation/clearance checks.
- `node .codex-review/v7-connectivity-test.cjs`: 10/10, now checking all eight variants, six throats, floor well, 543 animation samples, traffic caching and geometry budget.
- `node .codex-review/v7-personnel-clearance.cjs`: 5/5, no findings in tested finite ray grids.
- `node lunar-validation.cjs`: 15/15 for the bundled HTML. Actual room total: 80 batches / 228,984 instanced triangles, below the retained 230,000 upper budget.
- Removed the old arbitrary >100,000 triangle minimum, retaining nonempty geometry, exact envelope bounds and the existing upper limit. Detailed visual variety now has an explicit eight-profile equipment check.
- Real browser: overview and engineering/medical close-up inspected, medical section checked, model label MED verified, no console error captured. Shell-mounted lights are removed with the sectioned shell.

These are software/geometry checks, not structural certification or GPU performance measurements. English typography still has the previously documented Novecento fallback; this task does not resolve that missing font.

Source backup: `.codex-review/pre-reference-models/`. Build: `node build-simulation.cjs`. Offline output: `月宫华容_三维仿真软件.html`.
