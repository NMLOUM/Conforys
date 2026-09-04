// Bouton d'action de ligne de tableau — style de référence : page Incidents
// (BoutonsAction : Soumettre/Valider/Rejeter/Clôturer). Centralise la forme
// commune (taille, arrondi, police) et la logique de couleur par variante,
// pour que toutes les pages de liste utilisent exactement le même style.
const VARIANTS = {
  primary:       { className: "text-white",               style: { backgroundColor: "#0D2B4E" } },
  success:       { className: "text-white",               style: { backgroundColor: "#2E7D32" } },
  neutral:       { className: "text-white",               style: { backgroundColor: "#475569" } },
  dangerOutline: { className: "border hover:bg-red-50",    style: { borderColor: "#DC2626", color: "#DC2626" } },
  outline:       { className: "border hover:bg-[#F8FAFC]", style: { borderColor: "#0D2B4E",  color: "#0D2B4E" } },
};

function ActionButton({ variant = "primary", loading = false, disabled, onClick, children, className = "", type = "button" }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors disabled:opacity-50 ${v.className} ${className}`}
      style={v.style}
    >
      {loading ? "…" : children}
    </button>
  );
}

export default ActionButton;
