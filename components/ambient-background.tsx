export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(235_55%_58%_/_0.12),_transparent_55%)]" />
      <div className="absolute -left-24 top-20 h-72 w-72 animate-ambient-drift rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-96 w-96 animate-ambient-drift rounded-full bg-accent/10 blur-3xl [animation-delay:4s]" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.35))]" />
    </div>
  );
}