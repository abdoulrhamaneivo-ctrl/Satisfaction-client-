import { Link } from 'react-router';
export function LegalLinks({ className = '' }) {
    return (<nav aria-label="Informations légales" className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs ${className}`}>
      <Link to="/conditions" className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Conditions d’utilisation
      </Link>
      <Link to="/confidentialite" className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Confidentialité
      </Link>
    </nav>);
}
//# sourceMappingURL=LegalLinks.jsx.map