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
  provider: string;
  model: string;
  onChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  open: boolean;
  error: string;
  isFollowUp: boolean;
  onClose: () => void;
}

export function Settings({
  provider,
  model,
  onChange,
  onModelChange,
  error,
  onClose,
}: SettingsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const availableModels = MODELS.filter(modelItem => {
    const isLocalMode = process.env.NEXT_PUBLIC_LOCAL_MODE === "true";
    if (isLocalMode) {
      return modelItem.providers.includes("openrouter") || modelItem.providers.includes("auto");
    }
    return true;
  });

  const selectedModelObj = availableModels.find(m => m.value === model);
  const availableProviders = selectedModelObj?.providers || [];

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon className="h-4 w-4 mr-2" />
          {selectedModelObj?.label || model}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          {error && (
            <div className="text-red-500 text-xs mb-2 p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          <div className="text-sm font-medium mb-2">Modèle</div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {availableModels.map((modelItem) => (
              <DropdownMenuItem
                key={modelItem.value}
                onClick={() => onModelChange(modelItem.value)}
                className={model === modelItem.value ? "bg-accent" : ""}
              >
                <div>
                  <div className="font-medium">{modelItem.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Providers: {modelItem.providers.join(", ")}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          
          {availableProviders.length > 1 && (
            <>
              <div className="text-sm font-medium mb-2 mt-4">Provider</div>
              <div className="space-y-1">
                {availableProviders.map((providerItem) => {
                  const providerConfig = PROVIDERS[providerItem as keyof typeof PROVIDERS];
                  return (
                    <DropdownMenuItem
                      key={providerItem}
                      onClick={() => onChange(providerItem)}
                      className={provider === providerItem ? "bg-accent" : ""}
                    >
                      <div className="flex items-center space-x-2">
                        {providerConfig && 'logo' in providerConfig && (
                          <Image
                            src={providerConfig.logo as string}
                            alt={providerItem}
                            width={16}
                            height={16}
                          />
                        )}
                        <span className="capitalize">{providerItem}</span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </>
          )}
          
          <div className="mt-4 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              className="w-full"
            >
              Fermer
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
