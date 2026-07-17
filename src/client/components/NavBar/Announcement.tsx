// TODO: personnalisez ce message (ou masquez le bandeau) selon vos besoins.
const ANNOUNCEMENT_URL = "#features";

export function Announcement() {
  return (
    <div className="from-accent to-secondary text-primary-foreground relative z-51 flex w-full items-center justify-center gap-3 bg-linear-to-r p-3 text-center font-semibold tracking-wider">
      <a
        href={ANNOUNCEMENT_URL}
        rel="noreferrer"
        className="hidden transition-opacity hover:opacity-90 hover:drop-shadow-sm lg:block"
      >
        🚀 Nouveau : suivi qualité en temps réel sur tous vos guichets
      </a>
      <div className="bg-primary-foreground/20 hidden w-0.5 self-stretch lg:block"></div>
      <a
        href={ANNOUNCEMENT_URL}
        rel="noreferrer"
        className="bg-background/20 hover:bg-background/30 hidden cursor-pointer rounded-full px-2.5 py-1 tracking-wider opacity-95 transition-colors lg:block"
      >
        Découvrir →
      </a>
      <a
        href={ANNOUNCEMENT_URL}
        className="bg-background/20 hover:bg-background/30 cursor-pointer rounded-full px-2.5 py-1 text-xs transition-colors lg:hidden"
        rel="noreferrer"
      >
        🚀 Suivi qualité en temps réel — Découvrir →
      </a>
    </div>
  );
}
