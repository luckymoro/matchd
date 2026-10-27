# HeadForge Studio Pro

A browser-based 3D character creator (head, face, skin, eyes, grooms, barber tools) built on Three.js r128, evolved from *3D Head Hair Studio v2*. Open `index.html` in a modern desktop browser with WebGL; no install needed (Three.js loads from a CDN).

## Tools
- **Blend** – DNA-style blend wheel between six face archetypes, plus random face/character.
- **Face** – 33 symmetric region controls (head, brows, eyes, nose, cheeks, mouth, jaw, ears, neck) and an Age slider (sagging, wrinkles, greying).
- **Sculpt** – free sculpting on a Loop-subdivided mesh (up to 60k tris): Draw, Inflate, Grab, Smooth, Flatten, Restore, with X symmetry. Hair, brows, lashes, eyes and mouth follow the surface.
- **Skin** – melanin × undertone tone map, roughness, pores, freckles, under-eye darkness, oil, subsurface scattering, translucency.
- **Eyes** – procedural irises (fibres, crypts, limbal ring), heterochromia, pupil/eyeball size, sclera, gaze modes, strand eyelashes.
- **Makeup** – lipstick + gloss, blush, eyeshadow, eyeliner.
- **Hair** – 16 styles (incl. *Curly fringe + low taper*, *Viking: slick back + top knot*, *Long curls with highlights*), up to 140k GPU strands, real-time guide-hair physics, material controls, strand eyebrows.
  - *Realistic rendering*: Marschner-style shading (white R glint, tinted TRT, backlit TT), per-strand colour variation and tapered tips. The key light casts soft shadows from hair and face onto the skin, and the hair self-shadows through its own thickness (deep-opacity style). Material › *Strand softness* and *Self-shadowing depth* tune it.
  - *Styling comb (real time)*: the **Comb** header button (or Hair › Styling comb) combs, lifts, smooths or relaxes the hair under the cursor. The groom becomes the physics rest pose, so it holds while still reacting to motion and wind, and it is baked into GLB/OBJ exports.
  - *Ears*: Flow & volume › *Hair at the ears* tucks the hair behind the ear or drapes it over it, instead of letting the ear poke through.
  - *Ear detection & hair distribution*: the ear is detected on the (sculpted) mesh and the hairline is cut around it like a barber's outline. *Detect ears* shows guides (yellow ear, blue outline, green taper, red sideburn/back line). Sliders set the clearance, taper width, sideburn height and back-hairline slope.
- **Facial hair** – stubble, mustache, goatee, boxed, full and long beards as strand grooms.
- **Groom & hair ties** (✎ tab, **Groom** header button, key G):
  - *Hair painting brushes*: Direction, Length, Density, Rough/Smooth, Sections, Colour/highlights, Tie mask, Blur and Erase. Brushes paint per-vertex scalp maps that every strand root samples, so the painting survives restyles, reseeds and haircuts. Mirror and invert (Ctrl/Alt) are supported, and painting is saved in undo and character JSON.
  - *Physical comb*: the comb drags the strands through the physics and combs them for good. Teeth (fine / medium / wide) and the smooth↔rough finish decide how silky or sectioned the hair ends up. Direction follows the stroke or is fixed, with an angle offset.
  - *Hair ties*: ponytail or bun / top knot, gathering all the hair, the top half or the crown. Pick a preset or click to place the tie; tightness, spread, bun size and band colour are adjustable, and the ponytail sways with motion and wind.
- **Barber** – clipper with guards, blades, motors and auto fade; cuts scalp hair and beards; timed scoring challenge. Pro tools: straight razor (shaves to clean skin), line designer (razor lines, free-hand or straight press-drag-release, adjustable width), trimmer/edger, scissors (cut to a length), thinning shears, clipper lever, flick-out blend and mirrored cutting. The blade cuts only what is under its footprint, edge on to the stroke, and a spatial grid keeps cutting fast at 140k strands.
- **Expressions** – 9 expression controls, emotion presets, live Idle / Talking / Emotion-tour previews.
- **Lighting** – 8 lighting rigs with matching reflections, rotation, exposure, tone mapping, backgrounds (incl. transparent / green screen), focal length, turntable.
- **Export** – PNG up to 4×, GLB and OBJ (mesh + baked hair strands), save/load full character JSON (including sculpt and haircut).
- Undo/redo (Ctrl+Z / Ctrl+Y), viewport modes (lit, clay, wireframe, topology), English / العربية UI with RTL.

## Development
Sources live in `src/` (`template.html`, `app.js`, `head-data.js`). Rebuild the single-file app with:

```sh
node build.mjs   # writes index.html
```
