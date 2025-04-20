---
title: LocalSite
emoji: 🐳
colorFrom: blue
colorTo: blue
sdk: docker
pinned: true
app_port: 5173
license: mit
short_description: Generate any application with DeepSeek
models:
  - deepseek-ai/DeepSeek-V3-0324
---

# LocalSite 🌐

LocalSite is a web creation platform that works 100% locally with Ollama. Perfect for developers who want to quickly create websites without external dependencies or authentication.

## Features

- **100% Local**: No authentication, no external API calls
- **Powered by Ollama**: Uses your local Ollama installation for AI capabilities
- **HTML/CSS/JS Generation**: Create complete websites from simple prompts
- **Live Preview**: See changes in real-time as you edit or generate content
- **Configurable Models**: Use any Ollama model you have installed locally

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Ollama](https://ollama.ai/) installed locally
- An Ollama-compatible model like deepseek, llama, codellama, etc.

## Getting Started

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/localsite
   cd localsite
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure your Ollama settings in `.env` file
   ```
   OLLAMA_URL=http://localhost:11434/api/chat
   OLLAMA_MODEL=deepseek-r1:7b  # Replace with your preferred model
   ```

4. Start the server
   ```bash
   npm start
   ```

5. Open http://localhost:5173 in your browser

## Available Models

You can use any model installed on your local Ollama instance. Here are some recommended models:

- `deepseek-r1:7b` - Good balance of performance and speed
- `codellama:7b` - Specialized for code generation
- `llama3:8b` - Good general-purpose model
- `gemma3:27b` - More powerful but requires more resources

To install these models on your Ollama instance:

```bash
ollama pull deepseek-r1:7b
```

## How it Works

LocalSite connects to your local Ollama instance and uses it to generate HTML, CSS, and JavaScript based on your prompts. All processing happens locally on your machine, ensuring privacy and eliminating the need for authentication or usage limits.

## License

MIT