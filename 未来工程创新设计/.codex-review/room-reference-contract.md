# Reference room model contract

Reference: the eight PNGs in D:/future-engineer-designment/房间模型图, inspected 2026-09-08.

- Shared silhouette: pale grey hard shell, squared/chamfered armor, dark corner posts, white vertical light bars, two landscape windows around a tall octagonal pressure-door surround, flush roof access frame and small vents. No large painted function bands or protruding roof cargo.
- Eight visual equipment profiles: HAB living, LSU life support, PWR energy, BIO cultivation, MED medical, ENG workshop, DCU servers, CMD command. Small colored status strips and equipment illumination carry profile identity.
- Keep the 24 stable room IDs, six simulation function groups, initial layout, missions, transport envelope (115 × 78 × 105 units), six port anchors, two decks and clear cross-passages. Equipment variants are visual subtypes; no implied change to traffic-demand or routing semantics.
- Keep doors retracting inwards, usable glazing and real interior geometry. Sectioning removes the selected shell/roof/door skins, retaining interiors. No flattened reference-image facade.
- Every mesh stays inside the configured transport envelope. Retain the existing upper 230,000 instanced room-triangle budget; no artificial minimum triangle count as a quality proxy.
- Validate existing mechanical, six-port, passage-clearance and 15 application integration checks; check real browser overview, close-up and section views.
