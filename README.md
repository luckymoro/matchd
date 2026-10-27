# HeadForge Studio Pro

A browser-based 3D character creator (head, face, skin, eyes, grooms, barber tools) built on Three.js r128, evolved from *3D Head Hair Studio v2*. Open `index.html` in a modern desktop browser with WebGL; no install needed (Three.js loads from a CDN).

## Tools
- **Blend** – DNA-style blend wheel between six face archetypes, plus random face/character.
- **Face** – 33 symmetric region controls (head, brows, eyes, nose, cheeks, mouth, jaw, ears, neck) and an Age slider (sagging, wrinkles, greying).
- **Sculpt** – free sculpting on a Loop-subdivided mesh (up to 60k tris): Draw, Inflate, Grab, Smooth, Flatten, Restore, with X symmetry. Hair, brows, lashes, eyes and mouth follow the surface.
- **Skin** – melanin × undertone tone map, roughness, pores, freckles, under-eye darkness, oil, subsurface scattering, translucency.
- **Import head** (Face tab, or drop a file on the viewport): OBJ, GLB or FBX. The largest mesh is welded, oriented (Y/Z up, facing) and fitted to the rig by crown and nose tip, with scale and offset sliders. Built-in eyes are placed in found eye sockets (hidden otherwise). *Default head* restores the original. The imported head is not saved in character files.
- **Eyes** – Gaze is soft-limited (default 28° sideways, less up than down) and relaxes forward for targets behind; limit and tracking speed are sliders. procedural irises (fibres, crypts, limbal ring), heterochromia, pupil/eyeball size, sclera, gaze modes, strand eyelashes.
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
- **Barber** – clipper with guards, blades, motors and auto fade; cuts scalp hair and beards; timed scoring challenge.
  - *Real clipper model*: the supplied cordless-clipper FBX is baked into the cutting frame (blade edge at the origin, blade face on the scalp, body trailing 28° off the surface). The blade is its own mesh and vibrates while cutting.
  - *Machine view*: real guard combs (tapered ribs as deep as the guard; the clipper rides on them), a fine buzz instead of jitter, a stroke direction that is smoothed and never flips, a vibration slider, and machine opacity or Hide (H). With the machine faded, an orange outline shows the blade footprint.
  - *Clipper mechanics* (always on in Career, optional in free mode): battery drain and 6 s recharge (R), blade heat that burns skin above 92 % (oil halves the heating, cool spray Q drops it), hair clog that thins the cut until you brush the blade (B), blade oil (O), nicks when you shave fast, and a customer mood that shows on the face.
  - *Career*: customers arrive with a random head and an order (buzz, low/mid/high fade, taper, undercut, scissor top, drop fade, razor line-up); you cut against the order's ideal lengths under a timer and are paid by accuracy, speed, mood and tips. XP and levels unlock the trimmer, scissors, razor and thinning shears; money buys blades, motors, finishes and supplies in the Shop. Progress is saved in the browser. Pro tools: straight razor (shaves to clean skin), line designer (razor lines, free-hand or straight press-drag-release, adjustable width), trimmer/edger, scissors (cut to a length), thinning shears, clipper lever, flick-out blend and mirrored cutting. The blade cuts only what is under its footprint, edge on to the stroke, and a spatial grid keeps cutting fast at 140k strands.
- **Expressions** – 9 expression controls, emotion presets, live Idle / Talking / Emotion-tour previews.
- **Stage** (Lighting tab): a procedural barber shop (checker floor, marble and wood walls, shelves, neon sign, barber pole, ceiling lights, real-time mirror, tufted-leather chair and a draped cape) with a matching reflection environment and the *Barber shop* rig. Toggle chair/cape and mirror, scale the room lights, or switch to the plain studio background. A *Room* camera shows the whole shop.
- **Skin maps & generator** (Skin tab): the scan maps from the asset tool (base, normal, roughness, cavity, SSS) are fitted to this head through the tool's frontal planar UV (`u = 0.5 + 0.21x`, `v = 0.52 + 0.205(y - 2.377)`), keep the tone slider alive (the base map acts as detail), and can be replaced by maps you drop onto the viewport or by a generated set (512 to 2048) baked from the skin settings, with per-map PNG download and fit/offset controls.
- **Lighting** – 8 lighting rigs with matching reflections, rotation, exposure, tone mapping, backgrounds (incl. transparent / green screen), focal length, turntable.
- **Export** – PNG up to 4×, GLB and OBJ (mesh + baked hair strands), save/load full character JSON (including sculpt and haircut).
- Undo/redo (Ctrl+Z / Ctrl+Y), viewport modes (lit, clay, wireframe, topology), English / العربية UI with RTL.

## Development
Sources live in `src/` (`template.html`, `app.js`, `head-data.js`). Rebuild the single-file app with:

```sh
node build.mjs   # writes index.html
```
