"use client";

// Configuration côté client
export const isLocalMode = (): boolean => {
  // Vérifier si on est en mode local via l'URL ou l'environnement
  if (typeof window !== "undefined") {
    // Si NEXT_PUBLIC_LOCAL_MODE est défini
    if (process.env.NEXT_PUBLIC_LOCAL_MODE === "true") {
      return true;
    }
    // Détection automatique basée sur l'URL
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  }
  return process.env.NEXT_PUBLIC_LOCAL_MODE === "true";
};

export const getApiEndpoint = (endpoint: string): string => {
  const localMode = isLocalMode();
  
  switch (endpoint) {
    case "/api/ask-ai":
      // En mode local, utiliser l'API locale avec Ollama
      return localMode ? "/api/ask-ai-local" : "/api/ask-ai";
    case "/api/auth":
      // En mode local, pas d'authentification mais retourner une chaîne valide
      return localMode ? "/api/me" : "/api/auth";
    default:
      return endpoint;
  }
};

export const getDefaultProvider = (): string => {
  // Utiliser Ollama en mode local
  return isLocalMode() ? "ollama" : "auto";
};

export const getDefaultModel = (): string => {
  // Utiliser le modèle Ollama local au lieu du modèle cloud
  return isLocalMode() ? "deepseek-r1:7b" : "deepseek-ai/DeepSeek-V3-0324";
};
