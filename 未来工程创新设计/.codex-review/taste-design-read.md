# Taste redesign: design read and preservation contract

Date: 2026-09-08

Skill: `C:/Users/Lenovo/.codex/skills/design-taste-frontend/SKILL.md`
Source: https://github.com/Leonxlnx/taste-skill/tree/main/skills/taste-skill

Reading this as a redesign of a lunar architectural visualization for project demonstrations, using a cinematic industrial science-fiction language. The 3D scene is the primary visual, with a quiet native-CSS control surface.

DESIGN_VARIANCE: 7. Recompose hierarchy, typography and grouping without changing the information architecture.
MOTION_INTENSITY: 3. Interface feedback only; spend continuous rendering work on the actual simulation and camera interaction.
VISUAL_DENSITY: 4. Keep the three demonstrations, selected room, floor map and playback accessible, reducing decorative labels.

## Audit before changes

- Existing brand: LUNARIS / 月序, existing geometric mark, orange #ff8051, graphite #0b1014, off-white text, six room colors with real functional meaning.
- Fonts: self-hosted Lunaris Sans (Noto Sans SC subset) and Lunaris Display (Space Grotesk subset).
- Current layout: 80px header, 128px playback, task/room left rail and floor-map right rail. At 1081×898 the 3D region is 594×690 CSS px.
- Existing IA: one offline HTML URL; six camera views, human-flow and section analysis, six-axis room scheduling, quality/settings drawer, three preset demonstrations, five playback speeds.
- Preserve all 84 element IDs, event attributes, option values, keyboard/pointer behavior, room size/color identity, six hatches, compact Cartesian building arrangement and mechanical lifts.
- Retire repetitive uppercase eyebrows, decorative section numbering, excessive row rules, uniform visual weight and purely ornamental symbols. Do not remove meaningful room IDs, level IDs, dimensions or analysis legends.
- Scene diagnosis: broad environment fill suppresses light direction. Original post-processing applies AO and linear bloom after display conversion. Extruded wall-panel UVs use world coordinates against clamped maps, hiding most texture detail.
- Baseline performance: previous round, native 1081×898, high 891×1035 draw buffer:49FPS/P95 33.4ms; performance742×862:60FPS/P95 16.8ms. Single-device 9-second camera runs, not guarantees.

## Contextual skill use

This skill explicitly targets landing pages and portfolios and excludes dense product controls. Apply its redesign audit, typography, palette consistency, deliberate composition, restraint, responsive layout and accessibility checks to the exhibition surface. Keep existing vanilla Three.js/HTML architecture rather than migrate a working offline app to a marketing-site React framework.

The real, interactive WebGL scene provides the visual asset. It is not a fake screenshot or placeholder. Material work uses actual surface textures and UVs, not a decorative page background. Marketing testimonials, logo walls, pricing, scroll hijacks, external hero photography and marketing SEO migration are inapplicable.

The established dark space-exhibition theme remains deliberate. Six room colors and human-flow colors communicate data and therefore remain distinct from the one UI accent. No gameplay, fictional metrics, game HUD, missions-as-gameplay or avatar mechanics are added.

## Quality approach

- Preserve geometry and instancing. Change only texture coordinates where needed.
- Use shared, bounded-resolution material maps and a small number of static light sources.
- Compose scene radiance, AO and bloom in linear space before a single filmic and display conversion.
- Preserve MSAA, FXAA, idle rendering suspension and eight-sample still refinement.
- Verify real browser visuals, shader errors, desktop/mobile layout, source/bundle functionality and independent camera performance. Mocked integration tests do not establish rendered image quality.
