"use client";

import { useState } from "react";
import { Settings, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODELS, PROVIDERS } from "@/lib/providers";

interface AiSettingsProps {
  selectedModel: string;
  selectedProvider: string;
  onModelChange: (model: string) => void;
  onProviderChange: (provider: string) => void;
}

export function AiSettings({
  selectedModel,
  selectedProvider,
  onModelChange,
  onProviderChange,
}: AiSettingsProps) {
  const [open, setOpen] = useState(false);

  // En mode local avec OpenRouter, utiliser les modèles OpenRouter
  const availableModels = MODELS.filter(model => {
    // Si on est en mode local (LOCAL_MODE=true), ne montrer que les modèles compatibles avec OpenRouter
    const isLocalMode = process.env.NEXT_PUBLIC_LOCAL_MODE === "true";
    if (isLocalMode) {
      // Retourner les modèles qui supportent OpenRouter ou auto
      return model.providers.includes("openrouter") || model.providers.includes("auto");
    }
    return true;
  });

  const selectedModelObj = availableModels.find(m => m.value === selectedModel);
  const availableProviders = selectedModelObj?.providers || [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          {selectedModelObj?.label || selectedModel}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <div className="text-sm font-medium mb-2">Modèle</div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {availableModels.map((model) => (
              <DropdownMenuItem
                key={model.value}
                onClick={() => onModelChange(model.value)}
                className={selectedModel === model.value ? "bg-accent" : ""}
              >
                <div>
                  <div className="font-medium">{model.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Providers: {model.providers.join(", ")}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          
          {availableProviders.length > 1 && (
            <>
              <div className="text-sm font-medium mb-2 mt-4">Provider</div>
              <div className="space-y-1">
                {availableProviders.map((provider) => (
                  <DropdownMenuItem
                    key={provider}
                    onClick={() => onProviderChange(provider)}
                    className={selectedProvider === provider ? "bg-accent" : ""}
                  >
                    <div className="flex items-center space-x-2">
                      {PROVIDERS[provider as keyof typeof PROVIDERS] && (
                        <img
                          src={PROVIDERS[provider as keyof typeof PROVIDERS].logo}
                          alt={provider}
                          className="w-4 h-4"
                        />
                      )}
                      <span className="capitalize">{provider}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
