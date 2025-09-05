import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Récupérer la liste des modèles depuis Ollama
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      // Si Ollama n'est pas disponible, retourner une liste vide
      return NextResponse.json({ models: [] });
    }
    
    const data = await response.json();
    
    // Transformer les modèles Ollama au format attendu par l'application
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models = data.models?.map((model: any) => ({
      value: model.name,
      label: `${model.name} (${formatSize(model.size)})`,
      providers: ["ollama"],
      autoProvider: "ollama",
      isLocal: true,
      size: model.size,
      modified: model.modified_at,
    })) || [];
    
    return NextResponse.json({ models });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error fetching Ollama models:", error);
    // En cas d'erreur, retourner une liste vide plutôt qu'une erreur 500
    return NextResponse.json({ models: [] });
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1e9) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  return `${(bytes / 1e9).toFixed(1)} GB`;
}