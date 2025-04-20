import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
// Suppression de tous les imports Huggingface pour une application 100% locale
import axios from "axios";
import bodyParser from "body-parser";

import checkUser from "./middlewares/checkUser.js";
import { PROVIDERS } from "./utils/providers.js";
import { COLORS } from "./utils/colors.js";

// Load environment variables from .env file
dotenv.config();

const app = express();

const ipAddresses = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.APP_PORT || 3000;
const REDIRECT_URI =
  process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/login`;
const MODEL_ID = process.env.OLLAMA_MODEL || "deepseek-r1:7b"; // Modèle configurable via .env
const MAX_REQUESTS_PER_IP = 2;

app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "dist")));

// Fonction simplifiée sans référence à Huggingface
const getPTag = () => {
  return `<p style="border-radius: 8px; text-align: center; font-size: 12px; color: #fff; margin-top: 16px;position: fixed; left: 8px; bottom: 8px; z-index: 10; background: rgba(0, 0, 0, 0.8); padding: 4px 8px;">Made with LocalSite</p>`;
};

// Routes de login supprimées - application 100% locale

// Route utilisateur simplifiée pour une utilisation 100% locale
app.get("/api/@me", async (_req, res) => {
  // Toujours retourner un utilisateur local fictif
  return res.send({
    preferred_username: "local-user",
    isLocalUse: true,
  });
});

// Fonction de déploiement simplifiée pour une utilisation locale
app.post("/api/deploy", async (req, res) => {
  const { html } = req.body;
  if (!html) {
    return res.status(400).send({
      ok: false,
      message: "Missing required fields",
    });
  }

  try {
    // Version simplifiée: juste retourner un succès sans déploiement réel
    // Dans une version future, on pourrait sauvegarder en local
    return res.status(200).send({ 
      ok: true, 
      path: "local/project",
      message: "Projet sauvegardé localement"
    });
  } catch (err) {
    return res.status(500).send({
      ok: false,
      message: err.message,
    });
  }
});

app.post("/api/ask-ai", async (req, res) => {
  const { prompt, html, previousPrompt, provider } = req.body;
  if (!prompt) {
    return res.status(400).send({
      ok: false,
      message: "Missing required fields",
    });
  }

  let { hf_token } = req.cookies;
  let token = hf_token;

  if (process.env.HF_TOKEN && process.env.HF_TOKEN !== "") {
    token = process.env.HF_TOKEN;
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress ||
    req.ip ||
    "0.0.0.0";

  // Pas de restriction de connexion en mode local Ollama
  // Utiliser un token fictif car nous n'avons plus besoin de vérifier l'authentification
  token = "local-token";

  // Set up response headers for streaming
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let completeResponse = "";

  let TOKENS_USED = prompt?.length;
  if (previousPrompt) TOKENS_USED += previousPrompt.length;
  if (html) TOKENS_USED += html.length;

  const DEFAULT_PROVIDER = PROVIDERS.ollama;
  const selectedProvider =
    provider === "auto"
      ? DEFAULT_PROVIDER
      : PROVIDERS[provider] ?? DEFAULT_PROVIDER;

  if (provider !== "auto" && TOKENS_USED >= selectedProvider.max_tokens) {
    return res.status(400).send({
      ok: false,
      openSelectProvider: true,
      message: `Context is too long. ${selectedProvider.name} allow ${selectedProvider.max_tokens} max tokens.`,
    });
  }

  try {
    // Configuration pour Ollama
    const systemMessage = previousPrompt || html
      ? "You are an expert web developer and designer. Create visually appealing, modern web pages with clean code. Use proper HTML5 semantics and follow best practices for accessibility and performance. Prioritize unique and engaging user experiences with seamless interactions. Always wrap your code in a complete, valid HTML document with properly connected stylesheets and scripts."
      : "Create a visually stunning, modern webpage using HTML, CSS, and JavaScript. Follow these requirements precisely:\n\n1. AESTHETICS: Use modern design principles with beautiful typography, color schemes, and spacing. Create visually engaging layouts that draw attention.\n\n2. TECHNICAL REQUIREMENTS:\n   - Use TailwindCSS extensively (include <script src=\"https://cdn.tailwindcss.com\"></script> in head)\n   - Add modern icons using a CDN library like Font Awesome or Heroicons\n   - Create responsive layouts that work perfectly across all devices\n   - Use smooth animations and transitions for interactive elements\n   - Implement semantic HTML5 with proper accessibility attributes\n\n3. CODE QUALITY:\n   - Write clean, maintainable code with consistent indentation\n   - Use descriptive class and ID names\n   - Include helpful comments for complex sections\n   - Ensure valid HTML, CSS, and JavaScript\n\n4. CREATIVITY:\n   - Add unique interactive elements or animations\n   - Use creative layouts beyond standard templates\n   - Incorporate subtle design flourishes that enhance user experience\n\nALWAYS provide ONE COMPLETE HTML FILE with all CSS and JavaScript included. Do not send separate files.";

    const messages = [
      { role: "system", content: systemMessage },
      ...(previousPrompt ? [{ role: "user", content: previousPrompt }] : []),
      ...(html ? [{ role: "assistant", content: `Here is the current HTML code that needs to be improved or modified based on the user request. Analyze this code carefully and make the requested changes while preserving the existing structure where appropriate: \n\n${html}` }] : []),
      { role: "user", content: prompt },
    ];

    // Configuration de la requête Ollama
    const ollamaConfig = {
      model: provider !== "auto" ? provider : MODEL_ID,
      messages: messages,
      stream: true,
      options: {
        temperature: 0.8,
        top_p: 0.9
      }
    };

    // URL de l'API Ollama - utiliser une variable d'environnement ou configurez directement ici
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";

    // Fonction pour traiter la réponse d'Ollama en streaming
    const response = await axios({
      method: "post",
      url: ollamaUrl,
      data: ollamaConfig,
      responseType: "stream"
    });

    // Traitement du stream de réponse d'Ollama
    
    // Fonction pour terminer proprement le stream
    const endStream = () => {
      // Si le stream n'a pas déjà été terminé
      if (!res.writableEnded) {
        // Si la réponse ne contient pas de balise </html>, on l'ajoute
        if (!completeResponse.includes("</html>")) {
          res.write("\n</html>");
        }
        res.end();
      }
      
      // Arrête le stream Ollama s'il est encore actif
      if (response && response.data) {
        try {
          response.data.destroy();
        } catch (err) {
          console.error('Erreur lors de la fermeture du stream:', err);
        }
      }
    };
    
    response.data.on('data', (chunk) => {
      try {
        // Ollama envoie des objets JSON délimités par des sauts de ligne
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const data = JSON.parse(line);
          const content = data.message?.content;
          
          if (content) {
            res.write(content);
            completeResponse += content;

            // Vérification plus complète qu'on a bien un document HTML complet
            if (completeResponse.includes("</html>") && 
                completeResponse.includes("<!DOCTYPE html") && 
                completeResponse.includes("<head>") && 
                completeResponse.includes("</body>")) {
              // HTML est complet avec tous les éléments requis
              endStream();
              return;
            }
          }
          
          // Si on a fini la génération
          if (data.done) {
            endStream();
            return;
          }
        }
      } catch (e) {
        console.error('Erreur lors du parsing de la réponse Ollama:', e);
      }
    });
    // Gestion de la fin du stream
    response.data.on('end', () => {
      if (streamTimeout) {
        clearTimeout(streamTimeout);
        streamTimeout = null;
      }
      
      if (!res.writableEnded) {
        res.end();
      }
    });
    
    // Gestion des erreurs de stream
    response.data.on('error', (err) => {
      console.error('Erreur de stream:', err);
      
      if (streamTimeout) {
        clearTimeout(streamTimeout);
        streamTimeout = null;
      }
      
      if (!res.headersSent) {
        res.status(500).send({
          ok: false,
          message: err.message || "Une erreur s'est produite lors du streaming de la réponse"
        });
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  } catch (error) {
    if (error.message.includes("exceeded your monthly included credits")) {
      return res.status(402).send({
        ok: false,
        openProModal: true,
        message: error.message,
      });
    }
    if (!res.headersSent) {
      res.status(500).send({
        ok: false,
        message:
          error.message || "An error occurred while processing your request.",
      });
    } else {
      // Otherwise end the stream
      res.end();
    }
  }
});

// Route remix simplifiée pour une utilisation locale
// Dans une vraie application locale, cette fonction pourrait charger des modèles sauvegardés
app.get("/api/remix/:username/:repo", async (req, res) => {
  return res.status(404).send({
    ok: false,
    message: "Cette fonctionnalité n'est pas disponible en mode local",
  });
});
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
