import axios from "axios";

// Création d'une instance Axios pré-configurée pour notre API
const api = axios.create({
  // L'adresse de base de ton backend
  baseURL: "http://localhost:5000/api",
});

// Intercepteur : s'exécute AVANT chaque requête envoyée
// Il ajoute automatiquement le token JWT dans les headers
api.interceptors.request.use((config) => {
  // On récupère le token stocké dans le navigateur
  const token = localStorage.getItem("token");
  // Si un token existe, on l'ajoute au header Authorization
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;