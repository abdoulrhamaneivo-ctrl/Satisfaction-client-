import React from 'react'

/**
 * BandeauInstitutionnel — strip fin gris-50 sous le header (Doc 04 §5.5).
 * « Une plateforme au service de La Poste de Côte d'Ivoire »
 * Appelé par PublicShell (Landing) et les écrans publics.
 */
export function BandeauInstitutionnel() {
  return (
    <div className="w-full border-b border-border/80 bg-muted/50 px-6 py-2 text-center sm:px-8">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        Une plateforme au service de{' '}
        <span className="font-semibold text-foreground">La Poste de Côte d'Ivoire</span>
      </p>
    </div>
  )
}