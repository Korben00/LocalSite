import { useState, useEffect } from "react";

interface OllamaModel {
  value: string;
  label: string;
  providers: string[];
  autoProvider: string;
  isLocal: boolean;
}

interface UseOllamaModelsReturn {
  models: OllamaModel[];
  loading: boolean;
  error: string | null;
  isLocalMode: boolean;
}

export function useOllamaModels(): UseOllamaModelsReturn {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLocalMode = process.env.NEXT_PUBLIC_LOCAL_MODE === "true";

  useEffect(() => {
    if (!isLocalMode) {
      return;
    }

    const fetchModels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch("/api/ollama-models");
        if (!response.ok) {
          throw new Error("Failed to fetch Ollama models");
        }
        
        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        console.error("Error fetching Ollama models:", err);
        setError("Unable to fetch local models");
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [isLocalMode]);

  return {
    models,
    loading,
    error,
    isLocalMode,
  };
}