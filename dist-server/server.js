import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import axios from "axios";
import bodyParser from "body-parser";
// Load environment variables from .env file
dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.APP_PORT || 3000;
const MODEL_ID = process.env.OLLAMA_MODEL || "deepseek-r1:7b"; // Model configurable via .env file
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "dist")));
// Simplified route for local user
app.get("/api/@me", (_req, res) => {
    // Always return a fictional local user
    res.send({
        preferred_username: "local-user",
        isLocalUse: true,
    });
});
// Simplified deployment function for local use
app.post("/api/deploy", async (req, res) => {
    const { html } = req.body;
    if (!html) {
        res.status(400).send({
            ok: false,
            message: "Missing required fields",
        });
        return;
    }
    try {
        // In a future version, this could save the file locally
        res.status(200).send({
            ok: true,
            path: "local/project",
            message: "Project saved locally",
        });
    }
    catch (err) {
        const error = err;
        res.status(500).send({
            ok: false,
            message: error.message,
        });
    }
});
app.post("/api/ask-ai", async (req, res) => {
    const { prompt, html, previousPrompt, provider } = req.body;
    if (!prompt) {
        res.status(400).send({
            ok: false,
            message: "Missing required fields",
        });
        return;
    }
    // Set up response headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    let completeResponse = "";
    try {
        const systemMessage = previousPrompt || html
            ? "You are an expert web developer and designer. Create visually appealing, modern web pages with clean code. Use proper HTML5 semantics and follow best practices for accessibility and performance. Prioritize unique and engaging user experiences with seamless interactions. Always wrap your code in a complete, valid HTML document with properly connected stylesheets and scripts."
            : "Create a visually stunning, modern webpage using HTML, CSS, and JavaScript. Follow these requirements precisely:\n\n1. AESTHETICS: Use modern design principles with beautiful typography, color schemes, and spacing. Create visually engaging layouts that draw attention.\n\n2. TECHNICAL REQUIREMENTS:\n   - Use TailwindCSS extensively (include <script src=\"https://cdn.tailwindcss.com\"></script> in head)\n   - Add modern icons using a CDN library like Font Awesome or Heroicons\n   - Create responsive layouts that work perfectly across all devices\n   - Use smooth animations and transitions for interactive elements\n   - Implement semantic HTML5 with proper accessibility attributes\n\n3. CODE QUALITY:\n   - Write clean, maintainable code with consistent indentation\n   - Use descriptive class and ID names\n   - Include helpful comments for complex sections\n   - Ensure valid HTML, CSS, and JavaScript\n\n4. CREATIVITY:\n   - Add unique interactive elements or animations\n   - Use creative layouts beyond standard templates\n   - Incorporate subtle design flourishes that enhance user experience\n\nALWAYS provide ONE COMPLETE HTML FILE with all CSS and JavaScript included. Do not send separate files.";
        const messages = [
            { role: "system", content: systemMessage },
        ];
        if (previousPrompt) {
            messages.push({ role: "user", content: previousPrompt });
        }
        if (html) {
            messages.push({
                role: "assistant",
                content: `Here is the current HTML code that needs to be improved or modified based on the user request. Analyze this code carefully and make the requested changes while preserving the existing structure where appropriate: \n\n${html}`,
            });
        }
        messages.push({ role: "user", content: prompt });
        // Ollama request configuration
        const ollamaConfig = {
            model: provider !== "auto" ? provider : MODEL_ID,
            messages: messages,
            stream: true,
            options: {
                temperature: 0.8,
                top_p: 0.9,
            },
        };
        const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
        const response = await axios({
            method: "post",
            url: ollamaUrl,
            data: ollamaConfig,
            responseType: "stream",
        });
        const endStream = () => {
            if (!res.writableEnded) {
                if (!completeResponse.includes("</html>")) {
                    res.write("\n</html>");
                }
                res.end();
            }
            if (response && response.data) {
                try {
                    response.data.destroy();
                }
                catch (err) {
                    console.error("Error closing the stream:", err);
                }
            }
        };
        response.data.on("data", (chunk) => {
            try {
                const lines = chunk
                    .toString()
                    .split("\n")
                    .filter((line) => line.trim());
                for (const line of lines) {
                    const data = JSON.parse(line);
                    const content = data.message?.content;
                    if (content) {
                        res.write(content);
                        completeResponse += content;
                        if (completeResponse.includes("</html>") &&
                            completeResponse.includes("<!DOCTYPE html") &&
                            completeResponse.includes("<head>") &&
                            completeResponse.includes("</body>")) {
                            endStream();
                            return;
                        }
                    }
                    if (data.done) {
                        endStream();
                        return;
                    }
                }
            }
            catch (e) {
                console.error("Error parsing Ollama response:", e);
            }
        });
        response.data.on("end", () => {
            if (!res.writableEnded) {
                res.end();
            }
        });
        response.data.on("error", (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
                res.status(500).send({
                    ok: false,
                    message: err.message || "An error occurred while streaming the response",
                });
            }
            else if (!res.writableEnded) {
                res.end();
            }
        });
    }
    catch (error) {
        const axiosError = error;
        if (!res.headersSent) {
            res.status(500).send({
                ok: false,
                message: axiosError.message ||
                    "An error occurred while processing your request.",
            });
        }
        else {
            res.end();
        }
    }
});
app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});
app.listen(Number(PORT), () => {
    console.log(`Server is running on port ${PORT}`);
});
