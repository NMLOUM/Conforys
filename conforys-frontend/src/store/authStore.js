import { create } from "zustand";

// Store global qui gère l'état de connexion de l'utilisateur
export const useAuthStore = create((set) => ({
  // On récupère le token et l'utilisateur déjà stockés (si déjà connecté)
  token: localStorage.getItem("token") || null,
  user: JSON.parse(localStorage.getItem("user")) || null,

  // Action : connecter l'utilisateur (après un login réussi)
  login: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },

  // Action : déconnecter l'utilisateur
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
}));