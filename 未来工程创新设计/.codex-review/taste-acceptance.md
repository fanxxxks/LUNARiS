# Taste UI and cinematic lunar-art acceptance

Date: 2026-09-08. Scope: existing visualization and art direction, no gameplay additions.

## Skill and design

- Installed `design-taste-frontend` from `Leonxlnx/taste-skill/skills/taste-skill` with the Codex skill-installer helper because this environment does not provide `npx`.
- Read the installed SKILL.md and applied its contextual redesign protocol, hierarchy, typography, accent consistency, restrained motion and responsive/a11y audit. Design read and applicability decisions: `taste-design-read.md`.
- Preserved LUNARIS branding, 84 IDs, routes, option values, three demonstrations, six-axis controls, room identities and all simulation behavior.
- Rebuilt title/mission hierarchy, room inspector, floor-map surface and floating playback dock. Removed decorative section numbering and most English micro-labels. Retained offline variable fonts and their licenses.
- Final contrast fixes: opaque analysis active-state background (orange text 5.41:1), confirmation hover 9.21:1 and disabled 5.89:1. Typography at least 11px, primary controls at least 12px; focus rings and hidden behavior preserved. UI and camera transitions respect reduced-motion preference.

## Rendering and material changes

- Lower overview camera elevation and stronger directional key light, reduced fill/environment intensity. Sunrise/day/night remain selectable.
- Corrected Shape/Extrude wall-panel UVs to cover their full texture range. Actual vertices, indexes, doors, openings and room transforms are unchanged.
- Shared coating albedo, roughness, subtle seam/dust/scratch detail, brushed metal and an independent regolith height/roughness field.
- Two shared normal DataTextures are generated once: 512×512 coating and 512×256 brushed metal. They replace runtime height differences for the added hard-surface details. Roughness remains separately sampled; normal textures use linear data, mipmaps and correct Canvas-Y orientation.
- AO and bloom now compose in linear HDR before exposure, a single filmic transform and sRGB conversion. Bloom threshold raised to avoid broad glowing hulls.
- Half-resolution AO retains original depth samples (nearest filtering), then reconstructs four texel centers with bilinear/depth weights. No additional post-processing pass.
- Kept MSAA/FXAA, render resolutions, shadow resolutions, eight-sample still refinement and idle RAF suspension.

## Verification

- Source and initial final bundle: integration15/15 each, performance structure19/19 each, explicitly using source/bundle harness modes.
- After normal-map optimization and final UI fixes: latest bundle integration15/15, explicit useBundle:true performance19/19, rendering-math11/11.
- Normal textures stay shared and unchanged throughout playback, pointer input and quality changes: objects, pixel arrays and version=1 remain stable; generation exists only in initialization.
- Room geometry:64 batches and214,464 triangles. Whole-scene geometry/instance hash unchanged (`c808e501…de3e7`),164 meshes,475,806 scene triangles,4,119 instances. Render counters vary with visibility, passes and shadows.
- Browser verified1081×898,1280×720 and375×812, no horizontal overflow. Short desktop shows all three tasks and the selected-room panel. Mobile manual route preview/cancel works with181px bottom clearance.
- Browser checked default view, closeup, cinematic still, day/night, heatmap and section interaction; no driver/shader errors reported. Two embedded font faces loaded, Chinese coverage report has no missing CJK.
- Numeric regression validates linear-energy/exposure invariants and AO interpolation/depth-edge behavior. Mock tests are not evidence of rendered pixel quality.

## Native-scale camera measurements

Current device,1081×898 CSS window;594×690 CSS canvas;default sunrise;heatmap off;simulation paused;60FPS target. Each run:1 second warmup and8 seconds camera samples. No concurrent CPU verification.

| Version/profile | Draw buffer | AverageFPS | P95 | Frames |
|---|---|---:|---:|---:|
| New art before shared-normal optimization, high |891×1035|45|33.4ms|360|
| Final new art, high (4×MSAA+FXAA)|891×1035|46|33.4ms|368|
| Final new art, performance (2×MSAA+FXAA)|742×862|60|16.8ms|480|

Previous art iteration measured49/60FPS. New materials increase shading cost; high-frame mode retains60FPS on this device. The1FPS difference after normal-map optimization is too small to establish a statistically significant speedup from single runs, though shader sampling work is reduced. Camera composition also changed, so this is not an isolated material benchmark. No claim of universal60FPS or a full AAA game renderer is made.
