# Proposed Spec: Surface-Aware AI-Assisted Brushes

## Purpose

This document proposes a feasible architecture for adding **surface-aware adaptive brushes** to an existing raster painting app.

The goal is not to build Generative Fill, inpainting, or a live neural painting system. The goal is to let users paint in real time with brushes that respond to the visual logic of the image underneath them.

In plain terms:

> The user chooses a color, but the brush helps that color belong to the image.

For example, if the image is grainy, hazy, cyan-green, low contrast, and made of many tiny color variations, the brush should avoid depositing a flat solid color patch. Instead, it should adapt the painted color using local tone, grain, texture, haze, contrast, and palette information.

---

## Main Question for Codex Agent

We already have a raster painting app in progress.

Please review this spec against the current codebase and answer:

1. Can this be integrated into the existing app architecture?
2. If yes, what is the smallest safe integration path?
3. If no, what architectural limitation makes it better to build this as a new branch, module, or separate prototype?
4. Which current systems would need to change?
5. What would be the first technically meaningful prototype?

Please do not assume we need a full AI system immediately. The preferred first version should use image analysis maps plus GPU or canvas-based brush rendering.

---

## Product Concept

A raster painting app with **image-adaptive brushes**.

Instead of brushes only responding to standard properties like:

- color
- opacity
- size
- pressure
- texture
- blur
- intensity
- flow

The brush can also respond to the image surface underneath it:

- local color
- local luminance
- local contrast
- grain/noise
- texture frequency
- edge direction
- haze/softness
- palette bias
- local visual mood

The AI or computer vision layer helps analyze the image and configure brush behavior. The real-time painting loop should remain deterministic and performant.

---

## Core Principle

Separate **AI-assisted brush design** from **real-time brush rendering**.

### Good architecture

```text
Image analysis happens occasionally.
Brush rendering happens in real time.
```

### Avoid for MVP

```text
Neural network runs on every brush movement.
```

The ideal version is:

```text
On import, on command, or periodically:
    Analyze image.
    Generate hidden surface maps.
    Generate or update adaptive brush settings.

During painting:
    Brush shader / brush engine samples those maps.
    Stroke is rendered in real time.
```

---

## Definitions

### Surface-Aware Brush

A brush that modifies its output based on the visual surface underneath the brush stroke.

Example:

```text
Selected color:
    blue

Local surface:
    cyan-green, hazy, grainy, low contrast

Rendered stroke:
    blue shifted toward local palette,
    broken into grain,
    softened at the edges,
    compressed in contrast,
    partially absorbed into the background tone.
```

### Surface Maps

Hidden image-derived maps that describe useful visual properties of the current canvas or reference image.

Possible maps:

- `localColorMap`
- `luminanceMap`
- `contrastMap`
- `grainMap`
- `noiseMap`
- `edgeDirectionMap`
- `textureFlowMap`
- `hazeMap`
- `paletteMap`
- `semanticMaskMap`, optional later

### Brush Recipe

A serializable description of how a brush behaves.

The AI can generate or modify this recipe, but the brush renderer should execute it without needing live AI.

---

## Non-Goals

This feature should not initially attempt to be:

- Photoshop Generative Fill
- inpainting
- prompt-to-image generation
- image-to-image diffusion
- a neural network running on every brush dab
- a full Photoshop or Procreate clone
- a replacement for the existing brush engine
- a complete node editor in v1
- a semantic object-aware painting system in v1

The MVP should be much simpler:

> Analyze image, generate maps, paint with a shader-like adaptive brush.

---

## User Story

As an artist, I want to paint on top of an existing image without my strokes looking pasted on, so that my chosen colors inherit some of the image’s grain, haze, tone, and palette while still remaining controllable.

Example user flow:

1. User imports or opens an image.
2. User clicks **Analyze Surface**.
3. App generates hidden visual maps.
4. User selects a color.
5. User chooses **Surface Refract Brush**.
6. User paints on a new layer.
7. Brush adapts the selected color based on the image underneath.
8. User adjusts sliders like:
   - Surface Influence
   - Keep My Color
   - Borrow Grain
   - Match Light
   - Dissolve Edges
   - Palette Drift

---

## Suggested MVP Feature

### Feature Name

**Surface Refract Brush**

Alternative names:

- Surface-Aware Brush
- Contextual Pigment Brush
- Pigment Diffraction Brush
- Adaptive Surface Brush
- Optical Blend Brush

### MVP Behavior

The user chooses a color. The brush modifies that color as it paints by sampling the local image underneath.

The brush should support at least:

1. Local brightness adaptation
2. Local palette influence
3. Grain/noise modulation
4. Softened or broken stroke edges
5. Adjustable strength for each effect

---

## Proposed MVP Controls

Start with simple sliders.

```text
Surface Influence: 0 to 100
Keep My Color: 0 to 100
Borrow Grain: 0 to 100
Match Light: 0 to 100
Palette Drift: 0 to 100
Dissolve Edges: 0 to 100
Opacity: 0 to 100
Size: standard brush size control
Flow: standard brush flow control
```

### Control Meaning

#### Surface Influence

Global multiplier for how much the brush reacts to the image.

```text
0 = behaves like a normal brush
100 = strongly adapts to local surface
```

#### Keep My Color

Controls how much the selected color is preserved.

```text
0 = color can drift heavily toward the image palette
100 = selected color remains dominant
```

#### Borrow Grain

Controls how much the brush inherits local grain/noise.

```text
0 = smooth fill
100 = highly grain-adaptive
```

#### Match Light

Controls whether paint gets lighter or darker based on local luminance.

```text
0 = no light adaptation
100 = strong local brightness matching
```

#### Palette Drift

Controls how much the selected color is contaminated by the local palette.

```text
0 = no hue shift
100 = strong local palette influence
```

#### Dissolve Edges

Controls how much the stroke edge breaks into the local texture.

```text
0 = clean brush edge
100 = highly broken, absorbed edge
```

---

## Technical Architecture

### High-Level Data Flow

```text
Image / Canvas
    ↓
Surface Analysis
    ↓
Hidden Surface Maps
    ↓
Brush Recipe
    ↓
Real-Time Brush Renderer
    ↓
Painted Layer
```

### Runtime Split

```text
Slow / occasional:
    image analysis
    map generation
    AI/LLM brush recipe creation

Fast / real-time:
    pointer input
    brush dab generation
    shader/canvas rendering
    compositing to active layer
```

---

## Proposed System Components

### 1. Surface Analysis Module

Responsible for generating hidden maps from the current image or active reference layer.

Possible module name:

```text
surfaceAnalysis
```

Responsibilities:

- sample the image
- calculate luminance
- calculate local average color
- estimate local contrast
- estimate local grain/noise
- estimate edge direction
- estimate haze/softness
- optionally extract a dominant palette
- output maps as textures, image buffers, or typed arrays

Potential outputs:

```ts
type SurfaceAnalysisResult = {
  width: number;
  height: number;
  localColorMap: ImageData | GPUTexture | Float32Array;
  luminanceMap: ImageData | GPUTexture | Float32Array;
  contrastMap: ImageData | GPUTexture | Float32Array;
  grainMap: ImageData | GPUTexture | Float32Array;
  edgeDirectionMap?: ImageData | GPUTexture | Float32Array;
  hazeMap?: ImageData | GPUTexture | Float32Array;
  palette?: string[];
  createdAt: number;
};
```

Implementation does not need all maps in v1.

Recommended first maps:

```text
luminanceMap
localColorMap
grainMap
contrastMap
```

---

### 2. Adaptive Brush Renderer

Responsible for rendering brush strokes using the selected brush recipe and current surface maps.

Possible module name:

```text
adaptiveBrushRenderer
```

Inputs:

```ts
type AdaptiveBrushRenderInput = {
  x: number;
  y: number;
  pressure: number;
  velocity: number;
  selectedColor: RGBColor;
  brushSettings: AdaptiveBrushSettings;
  surfaceMaps: SurfaceAnalysisResult;
  activeLayer: LayerRef;
};
```

Output:

```text
Rendered brush dab or stroke segment composited onto the active layer.
```

The renderer should not call an LLM. It should only use available maps and brush settings.

---

### 3. Brush Recipe System

A brush recipe stores the behavior of an adaptive brush.

Example:

```ts
type AdaptiveBrushSettings = {
  id: string;
  name: string;

  size: number;
  opacity: number;
  flow: number;

  surfaceInfluence: number;      // 0 to 1
  preserveSelectedColor: number; // 0 to 1
  grainAdoption: number;         // 0 to 1
  luminanceMatch: number;        // 0 to 1
  paletteDrift: number;          // 0 to 1
  edgeDissolve: number;          // 0 to 1
  contrastMatch: number;         // 0 to 1

  grainScale: number;
  grainIntensity: number;
  edgeSoftness: number;

  blendMode: "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "custom";
};
```

Possible JSON representation:

```json
{
  "id": "surface-refract-v1",
  "name": "Surface Refract",
  "size": 48,
  "opacity": 0.8,
  "flow": 0.65,
  "surfaceInfluence": 0.65,
  "preserveSelectedColor": 0.72,
  "grainAdoption": 0.8,
  "luminanceMatch": 0.45,
  "paletteDrift": 0.35,
  "edgeDissolve": 0.55,
  "contrastMatch": 0.25,
  "grainScale": 1.4,
  "grainIntensity": 0.75,
  "edgeSoftness": 0.6,
  "blendMode": "normal"
}
```

---

## Core Brush Algorithm

For every brush dab or stroke fragment:

```text
1. Get pointer position.
2. Generate brush mask.
3. Sample selected paint color.
4. Sample underlying image at brush position.
5. Sample hidden surface maps at brush position.
6. Modify selected color using local surface data.
7. Modulate opacity and edge using grain/contrast maps.
8. Composite result onto active layer.
```

Pseudocode:

```ts
function renderAdaptiveBrushDab(input: AdaptiveBrushRenderInput) {
  const {
    x,
    y,
    pressure,
    selectedColor,
    brushSettings,
    surfaceMaps
  } = input;

  const localColor = sampleMap(surfaceMaps.localColorMap, x, y);
  const luminance = sampleMap(surfaceMaps.luminanceMap, x, y);
  const grain = sampleMap(surfaceMaps.grainMap, x, y);
  const contrast = sampleMap(surfaceMaps.contrastMap, x, y);

  const colorAfterPalette = mixColor(
    selectedColor,
    localColor,
    brushSettings.paletteDrift * brushSettings.surfaceInfluence
  );

  const colorAfterLuminance = applyLuminanceMatch(
    colorAfterPalette,
    luminance,
    brushSettings.luminanceMatch * brushSettings.surfaceInfluence
  );

  const opacityMask = generateBrushMask(x, y, brushSettings.size, pressure);

  const grainMask = applyGrainToMask(
    opacityMask,
    grain,
    brushSettings.grainAdoption * brushSettings.surfaceInfluence
  );

  const edgeMask = applyEdgeDissolve(
    grainMask,
    contrast,
    brushSettings.edgeDissolve * brushSettings.surfaceInfluence
  );

  compositeToLayer({
    color: colorAfterLuminance,
    mask: edgeMask,
    opacity: brushSettings.opacity,
    blendMode: brushSettings.blendMode
  });
}
```

---

## Important Design Constraint

The brush must remain predictable.

The selected color should not disappear unless the user chooses strong adaptation.

Recommended default:

```text
Keep My Color: high
Surface Influence: medium
Borrow Grain: high
Palette Drift: low-medium
Match Light: medium
Dissolve Edges: medium
```

This makes the brush feel image-aware without hijacking the artist’s intent.

---

## Possible AI Role

The AI should not be required for every stroke.

The AI can be used for:

1. Image analysis summary
2. Brush preset creation
3. Brush parameter tuning
4. Natural language brush editing
5. Naming and organizing brush presets

Example user prompts:

```text
Make this brush feel more like the foggy cyan grain in the image.
Make the color less solid.
Make the edges dissolve into the background.
Keep my selected color stronger.
Borrow more of the image texture.
Make this look like old film grain.
```

Possible AI output:

```json
{
  "surfaceInfluence": 0.72,
  "preserveSelectedColor": 0.68,
  "grainAdoption": 0.88,
  "luminanceMatch": 0.5,
  "paletteDrift": 0.32,
  "edgeDissolve": 0.62,
  "contrastMatch": 0.28,
  "grainScale": 1.6,
  "grainIntensity": 0.8,
  "edgeSoftness": 0.65
}
```

The renderer consumes the resulting values directly.

---

## Possible UI

### Surface Analysis Panel

```text
[Analyze Surface]
[Re-analyze Current Image]
[Use Active Layer as Surface Source]
[Use Full Composite as Surface Source]
[Show Surface Maps]
```

### Brush Panel

```text
Brush: Surface Refract

Size
Opacity
Flow

Surface Influence
Keep My Color
Borrow Grain
Match Light
Palette Drift
Dissolve Edges

[Ask AI to Tune Brush]
```

### AI Brush Prompt

```text
Describe how this brush should behave:

[ Make the blue feel absorbed into the misty grain of the image. ]

[Generate Brush]
```

### Debug / Developer View

```text
Show:
- Luminance Map
- Local Color Map
- Grain Map
- Contrast Map
- Final Brush Mask
- Final Composite Preview
```

---

## Integration Questions for Current Codebase

Codex should inspect the current app and answer the following.

### Canvas and Layer System

1. Is the app using Canvas 2D, WebGL, WebGPU, SVG, DOM, or another renderer?
2. How are layers represented?
3. Can the brush engine sample from the flattened canvas or from a specific source layer?
4. Can the active brush write to a separate layer?
5. Is there already a concept of blend modes?
6. Is there already an undo/redo stroke transaction system?

### Brush Engine

1. How are brush strokes currently represented?
2. Are strokes rendered as continuous paths, stamped dabs, or direct pixel manipulation?
3. Is pressure supported?
4. Is velocity supported?
5. Is brush texture already supported?
6. Can the brush renderer access pixels underneath the brush position?
7. Is the current brush system modular enough to add an `AdaptiveBrush` type?

### Performance

1. Can the app read pixel data without blocking the main thread?
2. Are expensive operations already moved to workers?
3. Is OffscreenCanvas used?
4. Is WebGL or WebGPU available?
5. Are brush dabs batched?
6. What is the current bottleneck during painting?

### State Management

1. Where are brush settings stored?
2. Are brush presets serializable?
3. Can new brush types be registered?
4. Can image analysis results be cached per document?
5. Can hidden maps be stored in project files?

### Best Integration Path

Codex should recommend one of:

```text
A. Integrate into existing brush engine.
B. Build as a new brush module.
C. Build as an isolated prototype inside the current app.
D. Build a separate proof-of-concept app.
E. Refactor canvas or layer system first.
```

---

## Recommended Implementation Phases

### Phase 0: Codebase Review

Goal:

```text
Decide whether this belongs inside the existing app now or as a separate prototype.
```

Questions:

- Can the current brush engine sample local pixels?
- Can it render custom masks?
- Can it support per-pixel color variation inside one brush stroke?
- Does it have performance headroom?
- Does the layer system support non-destructive experimentation?

Deliverable:

```text
Technical recommendation:
integrate, branch, prototype, or rebuild.
```

---

### Phase 1: Non-AI Adaptive Brush Prototype

Goal:

```text
Prove the brush can adapt to the image without AI.
```

Features:

- import/open image
- choose selected color
- generate simple luminance map
- generate simple local average color map
- generate simple grain/noise map
- paint with adaptive brush on new layer
- sliders for:
  - Surface Influence
  - Keep My Color
  - Borrow Grain
  - Match Light
  - Palette Drift

Success criteria:

```text
A flat color brush looks pasted on.
The adaptive brush looks more integrated with the image.
The brush remains real time.
The user can reduce adaptation when it becomes too aggressive.
```

---

### Phase 2: Better Surface Maps

Goal:

```text
Improve surface sensitivity.
```

Add:

- contrast map
- edge direction map
- texture frequency map
- haze/softness estimate
- local palette extraction

Success criteria:

```text
Brush reacts differently in dark, bright, sharp, hazy, grainy, and smooth areas.
```

---

### Phase 3: AI-Assisted Brush Recipe Generation

Goal:

```text
Let users describe the brush behavior with language.
```

Features:

- prompt field for brush tuning
- AI generates brush settings JSON
- app validates JSON
- user can accept, reject, or tweak sliders
- brush recipe can be saved as preset

Important:

```text
AI output must be constrained to known brush parameters.
Do not let AI produce arbitrary code in v1.
```

---

### Phase 4: Advanced Brush Graph

Goal:

```text
Expose a modular brush behavior system for advanced users.
```

Possible nodes:

- Input Color
- Local Color Sample
- Luminance Match
- Palette Drift
- Grain Modulator
- Edge Dissolve
- Texture Flow
- Blend Mode
- Final Composite

This should come later. It is not required for MVP.

---

## Performance Requirements

The brush must feel immediate.

Suggested targets:

```text
Pointer-to-paint latency: under 16 to 32 ms if possible
Brush rendering: no visible lag at common brush sizes
Surface analysis: can take longer, but should show progress if above 500 ms
AI brush generation: can be async and optional
```

Important performance rules:

- Do not run AI inference on every pointer event.
- Do not run expensive full-canvas analysis during active painting.
- Cache surface maps.
- Recompute maps only on command, on import, or after meaningful changes.
- Use lower-resolution maps if full resolution is too expensive.
- Consider workers or GPU compute for analysis.
- Keep brush preview responsive even if analysis is stale.

---

## Map Resolution Strategy

Surface maps may not need full canvas resolution.

Possible strategy:

```text
Full image:
    4096 x 4096

Surface maps:
    1024 x 1024 or 2048 x 2048

Sampling:
    bilinear interpolation during brush rendering
```

This reduces memory and improves performance.

The app can offer quality options later:

```text
Surface Analysis Quality:
- Fast
- Balanced
- High
```

---

## Layer Strategy

The safest v1 behavior:

```text
Use the flattened visible image or selected reference layer as the source surface.
Paint adaptive stroke onto a normal editable layer.
```

Avoid destructive edits to the source image.

Possible source modes:

```text
Surface Source:
- Full composite
- Active layer
- Background layer
- Selected reference layer
```

For MVP, start with one:

```text
Surface Source: flattened composite at time of analysis
```

---

## Handling Stale Analysis

If the user changes the image after analysis, surface maps may become outdated.

Simple v1 solution:

```text
Show status:
Surface Analysis: Fresh / Stale

Button:
[Re-analyze Surface]
```

Possible rule:

```text
If source layer changes significantly, mark maps as stale.
Do not auto-reanalyze during painting.
```

---

## File / Project Storage

If the app has project files, surface analysis data can be handled in two ways.

### Option A: Store maps

Pros:

- faster project reopen
- brush behavior preserved exactly

Cons:

- larger file size

### Option B: Store source plus analysis settings only

Pros:

- smaller files

Cons:

- maps need regeneration
- results may change if algorithms change

Recommended v1:

```text
Do not store maps permanently.
Store brush settings only.
Regenerate maps on project open or on command.
```

Later:

```text
Optional cache with invalidation.
```

---

## Minimal Technical Prototype

Codex should try to identify the smallest prototype equivalent to this:

```text
1. Load an image.
2. Generate a low-res luminance map.
3. Generate a low-res grain map.
4. User picks a color.
5. Brush paints to a new layer.
6. Brush color is modified by local luminance.
7. Brush opacity is modulated by grain.
8. User can toggle adaptive mode on/off.
```

If this works, continue.

If this does not fit the architecture, recommend a separate prototype.

---

## Suggested First Algorithm Details

### Luminance

```ts
function getLuminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
```

### Local Color

For each map pixel, sample a small neighborhood and average colors.

```text
Radius:
    3 to 12 pixels depending on analysis quality
```

### Grain / Noise Estimate

Simple starting point:

```text
grain = absolute difference between pixel luminance and local average luminance
```

This detects local high-frequency variation.

### Contrast Estimate

Simple starting point:

```text
contrast = local max luminance - local min luminance
```

### Palette Drift

```text
finalColor = mix(selectedColor, localColor, paletteDrift * surfaceInfluence)
```

### Luminance Match

```text
finalColor = adjustBrightness(finalColor, localLuminance, luminanceMatch)
```

### Grain Adoption

```text
finalOpacity = baseOpacity * mix(1.0, grainPattern, grainAdoption)
```

### Edge Dissolve

```text
finalMask = brushMask * grainInfluencedNoiseNearEdges
```

---

## Acceptance Criteria for MVP

The MVP is successful if:

1. The user can compare normal brush vs adaptive brush.
2. The adaptive brush visibly avoids flat solid color.
3. The adaptive brush responds to the image underneath.
4. The user can control adaptation strength.
5. Painting remains real time at reasonable brush sizes.
6. The feature works without live AI.
7. The feature can later accept AI-generated brush settings.
8. The implementation does not require rewriting the entire app unless the current brush architecture is fundamentally incompatible.

---

## Risks

### Risk 1: Brush becomes unpredictable

Mitigation:

- preserve selected color by default
- expose simple adaptation sliders
- show preview
- allow instant toggle back to normal brush

### Risk 2: Performance drops

Mitigation:

- precompute maps
- use lower-res maps
- avoid per-stroke AI
- use workers/GPU where possible
- batch dabs

### Risk 3: Feature becomes too broad

Mitigation:

- start with one brush
- start with three maps
- skip semantic understanding
- skip node editor
- skip diffusion/inpainting

### Risk 4: Architecture mismatch

Mitigation:

- first task is codebase review
- build isolated prototype if needed
- avoid forcing this into a weak brush system

---

## Open Questions for Codex Agent

Please answer these based on the current codebase:

1. What rendering system does the app currently use?
2. Where should surface analysis live?
3. Where should brush recipes live?
4. Is the current brush engine modular enough?
5. Can brush rendering sample from the image underneath?
6. Can we render per-pixel color variation inside a brush stroke?
7. Is it possible to store hidden maps per document?
8. Would OffscreenCanvas, WebGL, or WebGPU be needed?
9. What would be the fastest proof-of-concept?
10. What parts of the current app would block this feature?

---

## Recommended Next Step

Ask Codex to perform this first task:

```text
Review the current raster painting app codebase and determine whether a Surface Refract Brush can be integrated into the existing brush engine.

Look specifically at:
- canvas renderer
- layer system
- brush stroke pipeline
- brush settings/state
- undo/redo
- pixel sampling access
- performance bottlenecks

Then propose the smallest implementation path for a non-AI adaptive brush prototype that uses precomputed surface maps.
```

---

## Summary

The proposed feature is feasible with current technology if designed correctly.

The strongest approach is:

```text
Use computer vision/image processing to analyze the image occasionally.
Generate hidden surface maps.
Let a real-time brush shader or brush engine sample those maps while painting.
Use AI only to help generate or tune brush recipes.
```

The core product idea:

> A brush that understands the surface without needing to generate the image.

This keeps the app fast, controllable, artist-friendly, and technically realistic.
