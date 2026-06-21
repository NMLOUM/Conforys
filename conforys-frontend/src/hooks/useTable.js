import { useState, useMemo, useEffect } from "react";

const PAGE_SIZE = 10;

export function useTable(items, searchFields) {
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);

  const filtres = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) =>
      searchFields.some((champ) => {
        const val = champ.split(".").reduce((o, k) => o?.[k], item);
        return String(val ?? "").toLowerCase().includes(q);
      })
    );
  }, [items, recherche, searchFields]);

  // Retour page 1 dès qu'on modifie la recherche
  useEffect(() => { setPage(1); }, [recherche]);

  const totalPages = Math.max(1, Math.ceil(filtres.length / PAGE_SIZE));
  const affiches   = filtres.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { recherche, setRecherche, page, setPage, totalPages, filtres, affiches };
}
