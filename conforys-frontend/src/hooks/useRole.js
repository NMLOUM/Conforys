import { useAuthStore } from "../store/authStore";

/**
 * Hook réutilisable pour vérifier les permissions du rôle connecté.
 *
 * Utilisation :
 *   const { isAdmin, isQhse, isEmploye, can } = useRole();
 *   can("ADMIN", "RESPONSABLE_QHSE")  →  true si le rôle est dans la liste
 */
export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;

  return {
    role,
    isAdmin:   role === "ADMIN",
    isQhse:    role === "RESPONSABLE_QHSE",
    isEmploye: role === "EMPLOYE",
    // Renvoie true si le rôle courant est dans la liste fournie
    can: (...rolesAutorises) => rolesAutorises.includes(role),
  };
}
