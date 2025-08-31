"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface Project {
  id: string;
  space_id: string;
  prompts: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectsResponse {
  projects: Project[];
}

export function LoadProject({
  onLoad,
}: {
  onLoad: (project: {
    space_id: string;
    prompts: string[];
    html: string;
  }) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/me/projects");
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        
        const data: ProjectsResponse = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Impossible de charger les projets");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleLoadProject = async (project: Project) => {
    try {
      setLoading(true);
      
      // Récupérer le contenu HTML depuis HuggingFace
      const response = await fetch(
        `https://huggingface.co/spaces/${project.space_id}/raw/main/index.html`
      );
      
      if (!response.ok) {
        throw new Error("Impossible de récupérer le contenu HTML");
      }
      
      const html = await response.text();
      
      // Nettoyer le HTML pour enlever les éléments de tracking
      const cleanHtml = html
        .replace(/<script[^>]*data-name="BMC-Widget"[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<!-- Buy Me a Coffee Widget -->[\s\S]*?<!-- End Buy Me a Coffee Widget -->/gi, "")
        .replace(/<div[^>]*id="bmc-wbtn"[^>]*>[\s\S]*?<\/div>/gi, "");
      
      onLoad({
        space_id: project.space_id,
        prompts: project.prompts,
        html: cleanHtml,
      });
    } catch (err) {
      console.error("Error loading project:", err);
      setError("Impossible de charger le projet");
    } finally {
      setLoading(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Chargement des projets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-gray-500 p-4 text-center">
        Aucun projet trouvé
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
        >
          <div className="flex items-center space-x-3">
            <FolderOpen className="h-4 w-4 text-gray-500" />
            <div>
              <p className="font-medium text-sm">{project.space_id}</p>
              <p className="text-xs text-gray-500">
                {project.prompts.length} prompt(s) • {" "}
                {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLoadProject(project)}
            disabled={loading}
          >
            Charger
          </Button>
        </div>
      ))}
    </div>
  );
}
