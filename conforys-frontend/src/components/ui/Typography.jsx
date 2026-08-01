// Échelle typographique unique de l'application — à utiliser à la place de
// classes Tailwind ad hoc pour les titres et textes, afin que toutes les
// pages partagent exactement les mêmes tailles, graisses et couleurs.
//
//   PageTitle    (h1) — titre de page       : 24px bold,    navy    #0D2B4E
//   SectionTitle (h2) — titre de section    : 18px semibold, navy   #0D2B4E
//   SubTitle     (h3) — sous-titre          : 15px semibold, #1E293B
//   BodyText     (p)  — texte courant       : 14px regular,  #1E293B
//   Label        (span) — libellé de champ : 12px medium,   #64748B
//   Caption      (span) — légende/annotation: 11px regular,  #94A3B8
//
// Police : Inter partout (déjà réglée globalement dans index.css).

const COULEUR_PRINCIPALE  = "#1E293B";
const COULEUR_LABEL       = "#64748B";
const COULEUR_CAPTION     = "#94A3B8";
const COULEUR_NAVY        = "#0D2B4E";

export function PageTitle({ as: Tag = "h1", className = "", children, ...props }) {
  return (
    <Tag className={`text-2xl font-bold ${className}`} style={{ color: COULEUR_NAVY, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function SectionTitle({ as: Tag = "h2", className = "", children, ...props }) {
  return (
    <Tag className={`text-lg font-semibold ${className}`} style={{ color: COULEUR_NAVY, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function SubTitle({ as: Tag = "h3", className = "", children, ...props }) {
  return (
    <Tag className={`text-[15px] font-semibold ${className}`} style={{ color: COULEUR_PRINCIPALE, ...props.style }} {...props}>
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
    <Tag className={`text-xs font-medium ${className}`} style={{ color: COULEUR_LABEL, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export function Caption({ as: Tag = "span", className = "", children, ...props }) {
  return (
    <Tag className={`text-[11px] font-normal ${className}`} style={{ color: COULEUR_CAPTION, ...props.style }} {...props}>
      {children}
    </Tag>
  );
}

export const TYPO_COULEURS = {
  principale: COULEUR_PRINCIPALE,
  label: COULEUR_LABEL,
  caption: COULEUR_CAPTION,
  navy: COULEUR_NAVY,
};
