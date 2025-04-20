// Modification pour permettre l'utilisation en local sans authentification
export default async function checkUser(req, res, next) {
  // Toujours autoriser, pas besoin de login avec Ollama
  return next();
}
