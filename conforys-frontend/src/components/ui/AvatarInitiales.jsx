// Avatar rond avec initiales + nom — style de référence : page Incidents.
// Composant partagé pour éviter que chaque page ne définisse sa propre
// variante (tailles/couleurs divergentes constatées entre Incidents et
// Actions correctives).
function AvatarInitiales({ prenom, nom }) {
  if (!prenom && !nom) return <span className="text-[#94A3B8]">—</span>;
  const initiales = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
        style={{ backgroundColor: "#0D2B4E" }}>
        {initiales || "?"}
      </div>
      <span className="text-sm text-[#1E293B] truncate">{prenom} {nom}</span>
    </div>
  );
}

export default AvatarInitiales;
