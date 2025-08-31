"use client";
import { useState, useRef } from "react";
import { Upload, Folder } from "lucide-react";

import { Project } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Loading from "@/components/loading";
import { toast } from "sonner";
import { readProjectZip, readProjectFolder } from "@/lib/download-utils";

export const LoadProject = ({
  fullXsBtn = false,
  onSuccess,
}: {
  fullXsBtn?: boolean;
  onSuccess: (project: Project) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importType, setImportType] = useState<'zip' | 'folder'>('zip');
  
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleZipImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error("Please select a ZIP file.");
      return;
    }

    setIsLoading(true);
    try {
      const htmlContent = await readProjectZip(file);
      
      // Create a mock project object
      const project: Project = {
        _id: Date.now().toString(),
        title: file.name.replace('.zip', ''),
        html: htmlContent,
        prompts: [],
        user_id: 'local',
        space_id: Date.now().toString(),
        _updatedAt: new Date(),
        _createdAt: new Date()
      };

      toast.success("ZIP project imported successfully!");
      setOpen(false);
      onSuccess(project);
    } catch (error: any) {
      toast.error(error.message || "Failed to import ZIP file.");
    } finally {
      setIsLoading(false);
      if (zipInputRef.current) {
        zipInputRef.current.value = '';
      }
    }
  };

  const handleFolderImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      const htmlContent = await readProjectFolder(files);
      
      // Create a mock project object
      const project: Project = {
        _id: Date.now().toString(),
        title: 'Imported Folder Project',
        html: htmlContent,
        prompts: [],
        user_id: 'local',
        space_id: Date.now().toString(),
        _updatedAt: new Date(),
        _createdAt: new Date()
      };

      toast.success("Folder project imported successfully!");
      setOpen(false);
      onSuccess(project);
    } catch (error: any) {
      toast.error(error.message || "Failed to import folder.");
    } finally {
      setIsLoading(false);
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <div>
            <Button variant="outline" className="max-lg:hidden">
              <Upload className="size-4 mr-1.5" />
              Load existing Project
            </Button>
            <Button variant="outline" size="sm" className="lg:hidden">
              {fullXsBtn && <Upload className="size-3.5 mr-1" />}
              Load
              {fullXsBtn && " existing Project"}
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md !p-0 !rounded-3xl !bg-white !border-neutral-100 overflow-hidden text-center">
          <DialogTitle className="hidden" />
          <header className="bg-neutral-50 p-6 border-b border-neutral-200/60">
            <div className="flex items-center justify-center -space-x-4 mb-3">
              <div className="size-11 rounded-full bg-pink-200 shadow-2xs flex items-center justify-center text-2xl opacity-50">
                🎨
              </div>
              <div className="size-13 rounded-full bg-amber-200 shadow-2xl flex items-center justify-center text-3xl z-2">
                🥳
              </div>
              <div className="size-11 rounded-full bg-sky-200 shadow-2xs flex items-center justify-center text-2xl opacity-50">
                💎
              </div>
            </div>
            <p className="text-2xl font-semibold text-neutral-950">
              Import a Project
            </p>
            <p className="text-base text-neutral-500 mt-1.5">
              Import from a ZIP file or folder containing your project files.
            </p>
          </header>
          <main className="space-y-4 px-9 pb-9 pt-6">
            {/* Import Type Selection */}
            <div className="flex gap-2 mb-6 bg-neutral-100 p-1 rounded-lg">
              <Button
                variant={importType === 'zip' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setImportType('zip')}
                className={`flex-1 ${importType === 'zip' ? 'shadow-sm' : ''}`}
              >
                <Upload className="size-3.5 mr-1" />
                ZIP
              </Button>
              <Button
                variant={importType === 'folder' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setImportType('folder')}
                className={`flex-1 ${importType === 'folder' ? 'shadow-sm' : ''}`}
              >
                <Folder className="size-3.5 mr-1" />
                Folder
              </Button>
            </div>

            {/* ZIP Import */}
            {importType === 'zip' && (
              <div>
                <p className="text-sm text-neutral-700 mb-2">
                  Select a ZIP file containing your project
                </p>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipImport}
                  className="hidden"
                />
                <Button
                  variant="black"
                  onClick={() => zipInputRef.current?.click()}
                  className="relative w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loading
                        overlay={false}
                        className="ml-2 size-4 animate-spin"
                      />
                      Processing ZIP file...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Choose ZIP File
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Folder Import */}
            {importType === 'folder' && (
              <div>
                <p className="text-sm text-neutral-700 mb-2">
                  Select a folder containing your project files
                </p>
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-expect-error
                  webkitdirectory=""
                  multiple
                  onChange={handleFolderImport}
                  className="hidden"
                />
                <Button
                  variant="black"
                  onClick={() => folderInputRef.current?.click()}
                  className="relative w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loading
                        overlay={false}
                        className="ml-2 size-4 animate-spin"
                      />
                      Processing folder...
                    </>
                  ) : (
                    <>
                      <Folder className="size-4 mr-2" />
                      Choose Folder
                    </>
                  )}
                </Button>
              </div>
            )}
          </main>
        </DialogContent>
      </Dialog>
    </>
  );
};
