/** Animated per-theme wallpaper. Layers are driven by CSS vars set by each .theme-* class. */
export function ThemeScene() {
  return (
    <div className="scene-layer" aria-hidden="true">
      <i className="scene-sky" />
      <i className="scene-glow" />
      <i className="scene-mid" />
      <i className="scene-fore" />
      <i className="scene-veil" />
    </div>
  );
}
