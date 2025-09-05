import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json();
    
    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const zip = new JSZip();
    const projectName = "localsite-project";
    const projectFolder = zip.folder(projectName);
    
    if (!projectFolder) {
      throw new Error("Failed to create project folder");
    }

    // Extract CSS and JS from HTML
    const files = extractFilesFromHtml(html);
    
    // Add all files to the ZIP
    files.forEach(file => {
      projectFolder.file(file.name, file.content);
    });
    
    // Add README
    const readme = generateReadme(projectName);
    projectFolder.file("README.md", readme);
    
    // Generate ZIP
    const zipBlob = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${projectName}.zip"`,
      },
    });
  } catch (error) {
    console.error("Error generating ZIP:", error);
    return NextResponse.json(
      { error: "Failed to generate ZIP file" },
      { status: 500 }
    );
  }
}

interface ProjectFile {
  name: string;
  content: string;
}

function extractFilesFromHtml(html: string): ProjectFile[] {
  const files: ProjectFile[] = [];
  
  // Extract inline CSS
  const cssMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  let extractedCSS = "";
  
  if (cssMatches) {
    cssMatches.forEach((match) => {
      const cssContent = match.replace(/<\/?style[^>]*>/gi, "");
      extractedCSS += cssContent + "\n\n";
    });
  }
  
  // Extract inline JavaScript
  const jsMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  let extractedJS = "";
  
  if (jsMatches) {
    jsMatches.forEach((match) => {
      if (!match.includes("src=") && match.replace(/<\/?script[^>]*>/gi, "").trim()) {
        const jsContent = match.replace(/<\/?script[^>]*>/gi, "");
        extractedJS += jsContent + "\n\n";
      }
    });
  }
  
  // Create cleaned HTML
  let cleanHtml = html;
  
  // Replace inline styles with external CSS link
  if (extractedCSS) {
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    cleanHtml = cleanHtml.replace(
      "</head>",
      '  <link rel="stylesheet" href="styles.css">\n</head>'
    );
    files.push({ name: "styles.css", content: extractedCSS.trim() });
  }
  
  // Replace inline scripts with external JS link
  if (extractedJS) {
    cleanHtml = cleanHtml.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi, (match, content) => {
      return content.trim() ? "" : match;
    });
    cleanHtml = cleanHtml.replace(
      "</body>",
      '  <script src="script.js"></script>\n</body>'
    );
    files.push({ name: "script.js", content: extractedJS.trim() });
  }
  
  // Add the main HTML file
  files.push({ name: "index.html", content: cleanHtml });
  
  return files;
}

function generateReadme(projectName: string): string {
  return `# ${projectName}

This project was generated using LocalSite - a 100% local web development tool powered by Ollama.

## Files Structure

- \`index.html\` - Main HTML file
- \`styles.css\` - Extracted CSS styles (if any)
- \`script.js\` - Extracted JavaScript code (if any)

## How to Use

1. Open \`index.html\` in your web browser
2. Or serve the folder using a local web server:
   \`\`\`bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have live-server installed)
   npx live-server
   \`\`\`

## About LocalSite

LocalSite is based on DeepSite by [@enzostvs](https://huggingface.co/enzostvs).
- Original project: [DeepSite on HuggingFace](https://huggingface.co/spaces/enzostvs/deepsite)

Generated on: ${new Date().toLocaleString()}
`;
}