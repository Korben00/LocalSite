"use client";

// Configuration côté client (valeurs stables SSR/Client)
export const isLocalMode = (): boolean => {
  // S'appuyer uniquement sur la variable publique pour garantir l'égalité SSR/Client
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
  // Stable côté serveur et client
  return process.env.NEXT_PUBLIC_LOCAL_MODE === "true" ? "ollama" : "auto";
};

export const getDefaultModel = (): string => {
  // Stable côté serveur et client
  return process.env.NEXT_PUBLIC_LOCAL_MODE === "true"
    ? "deepseek-r1:7b"
    : "deepseek-ai/DeepSeek-V3-0324";
};
