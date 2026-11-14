# Project Guidelines & Agent Skills

This repository is equipped with specialized motion, animation, and creative development skills and plugins for AI agents.

## Installed Plugins & Skills

### 1. Scroll Craft (`plugins/scroll-craft`, `skills/scroll-craft`)
- **Plugin:** `scroll-craft` (v0.3.1 by Nate Herk)
- **Primary Skill:** [`scroll-craft`](.agents/skills/scroll-craft/SKILL.md)
- **Use Cases:** Building premium, scroll-driven landing pages, layered dimensional heroes with independent visual planes, restrained motion, scrollytelling, customer-journey maps, token-driven design floors, and multi-state responsive scroll layouts.
- **Key Rules:**
  - **Variety is the product:** Use at least four device families across a page and never the same device twice in a row.
  - **Dimensional layering:** Baseline requirement for premium marketing heroes (independent foreground, subject, background, and atmospheric planes).
  - **Photographic unless illustrated:** Avoid generic claymation/diorama defaults.
  - **No continuous camera chain:** Vary devices rather than forcing brittle, unbroken camera flights.

---

### 2. GSAP Skills (`plugins/gsap-skills`, `skills/gsap-*`)
- **Plugin:** `gsap-skills` (v1.0.0 by GreenSock)
- **Official Skills:**
  - [`gsap-core`](.agents/skills/gsap-core/SKILL.md) — Tweens (`to`, `from`, `fromTo`), easing, durations, staggers, and responsive `gsap.matchMedia()`.
  - [`gsap-timeline`](.agents/skills/gsap-timeline/SKILL.md) — Complex sequences, position parameters (`+=`, `-=`, `<`), labels, nesting, and flow control.
  - [`gsap-scrolltrigger`](.agents/skills/gsap-scrolltrigger/SKILL.md) — Scroll-linked animations, scrub, pinning, markers, trigger coordinates, and `clamp()`.
  - [`gsap-react`](.agents/skills/gsap-react/SKILL.md) — `@gsap/react`, `useGSAP()`, ref scoping, dependency arrays, and strict mode cleanup.
  - [`gsap-frameworks`](.agents/skills/gsap-frameworks/SKILL.md) — Vue 3 (`onMounted`, composables), Nuxt 4 (SSR safe), Svelte, Next.js, and Astro.
  - [`gsap-plugins`](.agents/skills/gsap-plugins/SKILL.md) — Flip, Draggable, MotionPath, DrawSVG, SplitText, and ScrambleText.
  - [`gsap-performance`](.agents/skills/gsap-performance/SKILL.md) — `will-change`, transform3d, batching, lagSmoothing, ticker, and leak prevention.
  - [`gsap-utils`](.agents/skills/gsap-utils/SKILL.md) — `clamp()`, `mapRange()`, `interpolate()`, `wrap()`, and math helpers.
- **Key Rules:**
  - Default to GSAP for non-trivial web animation, timelines, and scroll effects.
  - Always clean up animations on component unmount (`useGSAP()`, `ctx.revert()`).
  - Use `gsap.matchMedia()` for responsive animations and `prefers-reduced-motion`.

---

### 3. WebGL Animation Skills (`plugins/webgl-animation-skills`, `skills/*`)
- **Plugin:** `webgl-animation-skills` (v0.1.0 by iart.ai)
- **Skills:**
  - [`threejs-animation`](.agents/skills/threejs-animation/SKILL.md) — Three.js scenes, camera moves, GLTF clips, instancing, scroll-linked 3D, React Three Fiber (R3F), and leak-free GPU disposal (`dispose()`).
  - [`shader-glsl`](.agents/skills/shader-glsl/SKILL.md) — GLSL fragment shaders, gradients, noise/fbm, Signed Distance Fields (SDFs), domain warping, image transitions, and `ShaderMaterial`.
  - [`particle-system`](.agents/skills/particle-system/SKILL.md) — Particles, confetti, sparks, smoke, flow fields, curl noise, connected constellations, semi-implicit Euler integration, and GPU `Points` shaders.
- **Key Rules:**
  - **GPU Memory Management:** Always dispose geometries, materials, and textures when scenes or components unmount to prevent WebGL context loss and memory leaks.
  - **Frame-rate Independence:** Scale particle integration and physics updates by delta time (`dt`) clamped to a safe ceiling.
  - **Render Loop Efficiency:** Avoid allocating objects/vectors inside `requestAnimationFrame` or `useFrame`.

