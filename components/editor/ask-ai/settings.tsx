"use client";

import { useState } from "react";
import { Settings as SettingsIcon, ChevronDown } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODELS, PROVIDERS } from "@/lib/providers";

interface SettingsProps {
  selectedModel: string;
  selectedProvider: string;
  onModelChange: (model: string) => void;
  onProviderChange: (provider: string) => void;
}

export function Settings({
  selectedModel,
  selectedProvider,
  onModelChange,
  onProviderChange,
}: SettingsProps) {
  const [open, setOpen] = useState(false);

  const availableModels = MODELS.filter(model => {
    const isLocalMode = process.env.NEXT_PUBLIC_LOCAL_MODE === "true";
    if (isLocalMode) {
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
          <SettingsIcon className="h-4 w-4 mr-2" />
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
                        <Image
                          src={PROVIDERS[provider as keyof typeof PROVIDERS].logo}
                          alt={provider}
                          width={16}
                          height={16}
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
