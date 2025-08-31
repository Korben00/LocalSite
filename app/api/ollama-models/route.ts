// 1. Correction pour app/api/ollama-models/route.ts
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

// 2. Correction pour app/layout.tsx
// Supprimer la ligne d'import non utilisée :
// import Script from "next/script";

// 3. Correction pour components/editor/footer/index.tsx
// Supprimer ou utiliser la variable 'currentHtml'

// 4. Correction pour components/my-projects/load-project.tsx
// Remplacer les types 'any' par des interfaces spécifiques

interface ProjectData {
  space_id: string;
  prompts: string[];
  // Ajoutez d'autres propriétés selon vos besoins
}

// Remplacer :
// const data: any = await response.json();
// Par :
// const data: ProjectData = await response.json();

// Et remplacer :
// // @ts-ignore
// Par :
// // @ts-expect-error - Description de pourquoi cette erreur est attendue

// 5. Correction pour lib/download-utils.ts
// Supprimer le paramètre 'projectName' non utilisé ou l'utiliser dans la fonction

// 6. Correction pour lib/providers-dynamic.ts
// Supprimer le disable ESLint si plus nécessaire
