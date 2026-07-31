// Échelle typographique unique de l'application — à utiliser à la place de
// classes Tailwind ad hoc pour les titres et textes, afin que toutes les
// pages partagent exactement les mêmes tailles, graisses et couleurs.
//
//   PageTitle    (h1) — titre de page                  : 18px semibold, navy
//   SectionTitle (h2) — titre de section                : 16px semibold, texte principal
//   SubTitle     (h3) — sous-titre (même poids que h2,   : 16px semibold, texte principal
//                        juste un niveau sémantique en dessous)
//   BodyText     (p)  — texte courant                   : 14px normal, texte principal
//   Label        (span) — libellé (formulaires, colonnes de tableau)
//                                                        : 12px semibold majuscules, texte secondaire
//   Caption      (span) — légende / annotation           : 11px normal, texte secondaire
//
// Couleurs : texte principal #1E293B, texte secondaire #64748B, titre de page navy (#0D2B4E).

const COULEUR_PRINCIPALE  = "#1E293B";
const COULEUR_SECONDAIRE  = "#64748B";
const COULEUR_NAVY        = "var(--color-navy, #0D2B4E)";

export function PageTitle({ as: Tag = "h1", className = "", children, ...props }) {
  return (
    <Tag className={`text-lg font-semibold ${className}`} style={{ color: COULEUR_NAVY, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function SectionTitle({ as: Tag = "h2", className = "", children, ...props }) {
  return (
    <Tag className={`text-base font-semibold ${className}`} style={{ color: COULEUR_PRINCIPALE, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function SubTitle({ as: Tag = "h3", className = "", children, ...props }) {
  return (
    <Tag className={`text-base font-semibold ${className}`} style={{ color: COULEUR_PRINCIPALE, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function BodyText({ as: Tag = "p", className = "", children, ...props }) {
  return (
    <Tag className={`text-sm font-normal ${className}`} style={{ color: COULEUR_PRINCIPALE, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function Label({ as: Tag = "span", className = "", children, ...props }) {
  return (
    <Tag className={`text-xs font-semibold uppercase tracking-wide ${className}`} style={{ color: COULEUR_SECONDAIRE, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function Caption({ as: Tag = "span", className = "", children, ...props }) {
  return (
    <Tag className={`text-[11px] font-normal ${className}`} style={{ color: COULEUR_SECONDAIRE, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export const TYPO_COULEURS = {
  principale: COULEUR_PRINCIPALE,
  secondaire: COULEUR_SECONDAIRE,
  navy: "#0D2B4E",
};
