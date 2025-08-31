/* CORRECTION 2 : lib/download-utils.ts */
"use client";

export const downloadAsZip = async (
  html: string,
  filename: string = "website"
) => {
  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la création du ZIP");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    throw error;
  }
};

export const downloadProjectAsZip = async (
  html: string,
  projectName: string = "project"
) => {
  return downloadAsZip(html, projectName);
};
