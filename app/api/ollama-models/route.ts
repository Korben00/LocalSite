import { NextResponse } from "next/server";

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface OllamaResponse {
  models: OllamaModel[];
}

export async function GET() {
  try {
    // Récupérer la liste des modèles depuis Ollama
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch Ollama models");
    }
    
    const data: OllamaResponse = await response.json();
    
    // Transformer les modèles Ollama au format attendu par l'application
    const models = data.models?.map((model: OllamaModel) => ({
      value: model.name,
      label: `${model.name} (${formatSize(model.size)})`,
      providers: ["ollama"],
      autoProvider: "ollama",
      isLocal: true,
      size: model.size,
      modified: model.modified_at,
    })) || [];
    
    return NextResponse.json({ models });
  } catch (error: unknown) {
    console.error("Error fetching Ollama models:", error);
    return NextResponse.json(
      { error: "Failed to fetch Ollama models", models: [] },
      { status: 500 }
    );
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1e9) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
  }
  return `${(bytes / 1e9).toFixed(1)} GB`;
}
