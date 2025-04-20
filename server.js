import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import {
  createRepo,
  uploadFiles,
  whoAmI,
  spaceInfo,
  fileExists,
} from "@huggingface/hub";
// Suppression de l'import Huggingface Inference et ajout du client Ollama
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

const getPTag = (repoId) => {
  return `<p style="border-radius: 8px; text-align: center; font-size: 12px; color: #fff; margin-top: 16px;position: fixed; left: 8px; bottom: 8px; z-index: 10; background: rgba(0, 0, 0, 0.8); padding: 4px 8px;">Made with <img src="https://enzostvs-deepsite.hf.space/logo.svg" alt="DeepSite Logo" style="width: 16px; height: 16px; vertical-align: middle;display:inline-block;margin-right:3px;filter:brightness(0) invert(1);"><a href="https://enzostvs-deepsite.hf.space" style="color: #fff;text-decoration: underline;" target="_blank" >DeepSite</a> - 🧬 <a href="https://enzostvs-deepsite.hf.space?remix=${repoId}" style="color: #fff;text-decoration: underline;" target="_blank" >Remix</a></p>`;
};

app.get("/api/login", (_req, res) => {
  const redirectUrl = `https://huggingface.co/oauth/authorize?client_id=${process.env.OAUTH_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20profile%20write-repos%20manage-repos%20inference-api&prompt=consent&state=1234567890`;
  res.status(200).send({
    ok: true,
    redirectUrl,
  });
});
app.get("/auth/login", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(302, "/");
  }
  const Authorization = `Basic ${Buffer.from(
    `${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`
  ).toString("base64")}`;

  const request_auth = await fetch("https://huggingface.co/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const response = await request_auth.json();

  if (!response.access_token) {
    return res.redirect(302, "/");
  }

  res.cookie("hf_token", response.access_token, {
    httpOnly: false,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.redirect(302, "/");
});
app.get("/auth/logout", (req, res) => {
  res.clearCookie("hf_token", {
    httpOnly: false,
    secure: true,
    sameSite: "none",
  });
  return res.redirect(302, "/");
});

app.get("/api/@me", checkUser, async (req, res) => {
  let { hf_token } = req.cookies;

  if (process.env.HF_TOKEN && process.env.HF_TOKEN !== "") {
    return res.send({
      preferred_username: "local-use",
      isLocalUse: true,
    });
  }

  try {
    const request_user = await fetch("https://huggingface.co/oauth/userinfo", {
      headers: {
        Authorization: `Bearer ${hf_token}`,
      },
    });

    const user = await request_user.json();
    res.send(user);
  } catch (err) {
    res.clearCookie("hf_token", {
      httpOnly: false,
      secure: true,
      sameSite: "none",
    });
    res.status(401).send({
      ok: false,
      message: err.message,
    });
  }
});

app.post("/api/deploy", checkUser, async (req, res) => {
  const { html, title, path, prompts } = req.body;
  if (!html || (!path && !title)) {
    return res.status(400).send({
      ok: false,
      message: "Missing required fields",
    });
  }

  let { hf_token } = req.cookies;
  if (process.env.HF_TOKEN && process.env.HF_TOKEN !== "") {
    hf_token = process.env.HF_TOKEN;
  }

  try {
    const repo = {
      type: "space",
      name: path ?? "",
    };

    let readme;
    let newHtml = html;

    if (!path || path === "") {
      const { name: username } = await whoAmI({ accessToken: hf_token });
      const newTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .split("-")
        .filter(Boolean)
        .join("-")
        .slice(0, 96);

      const repoId = `${username}/${newTitle}`;
      repo.name = repoId;

      await createRepo({
        repo,
        accessToken: hf_token,
      });
      const colorFrom = COLORS[Math.floor(Math.random() * COLORS.length)];
      const colorTo = COLORS[Math.floor(Math.random() * COLORS.length)];
      readme = `---
title: ${newTitle}
emoji: 🐳
colorFrom: ${colorFrom}
colorTo: ${colorTo}
sdk: static
pinned: false
tags:
  - deepsite
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference`;
    }

    newHtml = html.replace(/<\/body>/, `${getPTag(repo.name)}</body>`);
    const file = new Blob([newHtml], { type: "text/html" });
    file.name = "index.html"; // Add name property to the Blob

    // create prompt.txt file with all the prompts used, split by new line
    const newPrompts = ``.concat(prompts.map((prompt) => prompt).join("\n"));
    const promptFile = new Blob([newPrompts], { type: "text/plain" });
    promptFile.name = "prompts.txt"; // Add name property to the Blob

    const files = [file, promptFile];
    if (readme) {
      const readmeFile = new Blob([readme], { type: "text/markdown" });
      readmeFile.name = "README.md"; // Add name property to the Blob
      files.push(readmeFile);
    }
    await uploadFiles({
      repo,
      files,
      accessToken: hf_token,
    });
    return res.status(200).send({ ok: true, path: repo.name });
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

  if (!token) {
    ipAddresses.set(ip, (ipAddresses.get(ip) || 0) + 1);
    if (ipAddresses.get(ip) > MAX_REQUESTS_PER_IP) {
      return res.status(429).send({
        ok: false,
        openLogin: true,
        message: "Log In to continue using the service",
      });
    }

    token = process.env.DEFAULT_HF_TOKEN;
  }

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
      ? "You are a web expert - You can help create web pages based on clear requirements."
      : "ONLY USE HTML, CSS AND JAVASCRIPT. If you want to use ICON make sure to import the library first. Try to create the best UI possible by using only HTML, CSS and JAVASCRIPT. Use as much as you can TailwindCSS for the CSS, if you can't do something with TailwindCSS, then use custom CSS (make sure to import <script src=\"https://cdn.tailwindcss.com\"></script> in the head). Also, try to ellaborate as much as you can, to create something unique. ALWAYS GIVE THE RESPONSE INTO A SINGLE HTML FILE";

    const messages = [
      { role: "system", content: systemMessage },
      ...(previousPrompt ? [{ role: "user", content: previousPrompt }] : []),
      ...(html ? [{ role: "assistant", content: `The current code is: ${html}.` }] : []),
      { role: "user", content: prompt },
    ];

    // Configuration de la requête Ollama
    const ollamaConfig = {
      model: provider !== "auto" ? provider : MODEL_ID,
      messages: messages,
      stream: true,
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
    let streamTimeout;
    const MAX_STREAM_TIME = 120000; // 2 minutes maximum
    
    // Fonction pour terminer proprement le stream
    const endStream = () => {
      if (streamTimeout) {
        clearTimeout(streamTimeout);
        streamTimeout = null;
      }
      
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
    
    // Définir un timeout pour s'assurer que le stream ne reste pas bloqué indéfiniment
    streamTimeout = setTimeout(() => {
      console.log('Timeout de sécurité atteint, fermeture du stream');
      endStream();
    }, MAX_STREAM_TIME);
    
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

            if (completeResponse.includes("</html>")) {
              // Si on a trouvé une balise de fin HTML, on s'arrête
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

app.get("/api/remix/:username/:repo", async (req, res) => {
  const { username, repo } = req.params;
  const { hf_token } = req.cookies;

  let token = hf_token || process.env.DEFAULT_HF_TOKEN;

  if (process.env.HF_TOKEN && process.env.HF_TOKEN !== "") {
    token = process.env.HF_TOKEN;
  }

  const repoId = `${username}/${repo}`;

  const url = `https://huggingface.co/spaces/${repoId}/raw/main/index.html`;
  try {
    const space = await spaceInfo({
      name: repoId,
      accessToken: token,
      additionalFields: ["author"],
    });

    if (!space || space.sdk !== "static" || space.private) {
      return res.status(404).send({
        ok: false,
        message: "Space not found",
      });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(404).send({
        ok: false,
        message: "Space not found",
      });
    }
    let html = await response.text();
    // remove the last p tag including this url https://enzostvs-deepsite.hf.space
    html = html.replace(getPTag(repoId), "");

    let user = null;

    if (token) {
      const request_user = await fetch(
        "https://huggingface.co/oauth/userinfo",
        {
          headers: {
            Authorization: `Bearer ${hf_token}`,
          },
        }
      )
        .then((res) => res.json())
        .catch(() => null);

      user = request_user;
    }

    res.status(200).send({
      ok: true,
      html,
      isOwner: space.author === user?.preferred_username,
      path: repoId,
    });
  } catch (error) {
    return res.status(500).send({
      ok: false,
      message: error.message,
    });
  }
});
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
