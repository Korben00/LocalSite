/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { InferenceClient } from "@huggingface/inference";

import { MODELS, PROVIDERS } from "@/lib/providers";
import {
  DIVIDER,
  FOLLOW_UP_SYSTEM_PROMPT,
  INITIAL_SYSTEM_PROMPT,
  MAX_REQUESTS_PER_IP,
  REPLACE_END,
  SEARCH_START,
} from "@/lib/prompts";
import MY_TOKEN_KEY from "@/lib/get-cookie-name";

const ipAddresses = new Map();

export async function POST(request: NextRequest) {
  const authHeaders = await headers();
  const userToken = request.cookies.get(MY_TOKEN_KEY())?.value;

  const body = await request.json();
  const { prompt, provider, model, redesignMarkdown, html } = body;

  if (!model || (!prompt && !redesignMarkdown)) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const selectedModel = MODELS.find(
    (m) => m.value === model || m.label === model
  );
  if (!selectedModel) {
    return NextResponse.json(
      { ok: false, error: "Invalid model selected" },
      { status: 400 }
    );
  }

  if (!selectedModel.providers.includes(provider) && provider !== "auto") {
    return NextResponse.json(
      {
        ok: false,
        error: `The selected model does not support the ${provider} provider.`,
        openSelectProvider: true,
      },
      { status: 400 }
    );
  }

  let token = userToken;
  let billTo: string | null = null;

  /**
   * Handle local usage token, this bypass the need for a user token
   * and allows local testing without authentication.
   * This is useful for development and testing purposes.
   */
  if (process.env.HF_TOKEN && process.env.HF_TOKEN.length > 0) {
    token = process.env.HF_TOKEN;
  }

  const rawFwd = authHeaders.get("x-forwarded-for");
  const ip = rawFwd?.includes(",")
    ? rawFwd.split(",")[1].trim()
    : rawFwd || "unknown";

  if (!token) {
    ipAddresses.set(ip, (ipAddresses.get(ip) || 0) + 1);
    if (ipAddresses.get(ip) > MAX_REQUESTS_PER_IP) {
      return NextResponse.json(
        {
          ok: false,
          openLogin: true,
          message: "Log In to continue using the service",
        },
        { status: 429 }
      );
    }

    token = process.env.DEFAULT_HF_TOKEN as string;
    billTo = "huggingface";
  }

  const DEFAULT_PROVIDER = PROVIDERS.novita;
  const selectedProvider =
    provider === "auto"
      ? PROVIDERS[selectedModel.autoProvider as keyof typeof PROVIDERS]
      : PROVIDERS[provider as keyof typeof PROVIDERS] ?? DEFAULT_PROVIDER;

  try {
    // Create a stream response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the response
    const response = new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    (async () => {
      let completeResponse = "";
      try {
        const client = new InferenceClient(token);
        const chatCompletion = client.chatCompletionStream(
          {
            model: selectedModel.value,
            provider: selectedProvider.id as any,
            messages: [
              {
                role: "system",
                content: INITIAL_SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: redesignMarkdown
                  ? `Here is my current design as a markdown:\n\n${redesignMarkdown}\n\nNow, please create a new design based on this markdown.`
                  : html
                  ? `Here is my current HTML code:\n\n\`\`\`html\n${html}\n\`\`\`\n\nNow, please create a new design based on this HTML.`
                  : prompt,
              },
            ],
            max_tokens: selectedProvider.max_tokens,
          },
          billTo ? { billTo } : {}
        );

        while (true) {
          const { done, value } = await chatCompletion.next();
          if (done) {
            break;
          }

          const chunk = value.choices[0]?.delta?.content;
          if (chunk) {
            let newChunk = chunk;
            if (!selectedModel?.isThinker) {
              if (provider !== "sambanova") {
                await writer.write(encoder.encode(chunk));
                completeResponse += chunk;

                if (completeResponse.includes("</html>")) {
                  break;
                }
              } else {
                if (chunk.includes("</html>")) {
                  newChunk = newChunk.replace(/<\/html>[\s\S]*/, "</html>");
                }
                completeResponse += newChunk;
                await writer.write(encoder.encode(newChunk));
                if (newChunk.includes("</html>")) {
                  break;
                }
              }
            } else {
              const lastThinkTagIndex =
                completeResponse.lastIndexOf("</think>");
              completeResponse += newChunk;
              await writer.write(encoder.encode(newChunk));
              if (lastThinkTagIndex !== -1) {
                const afterLastThinkTag = completeResponse.slice(
                  lastThinkTagIndex + "</think>".length
                );
                if (afterLastThinkTag.includes("</html>")) {
                  break;
                }
              }
            }
          }
        }
      } catch (error: any) {
        if (error.message?.includes("exceeded your monthly included credits")) {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                openProModal: true,
                message: error.message,
              })
            )
          );
        } else {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                message:
                  error.message ||
                  "An error occurred while processing your request.",
              })
            )
          );
        }
      } finally {
        await writer?.close();
      }
    })();

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        openSelectProvider: true,
        message:
          error?.message || "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authHeaders = await headers();
  const userToken = request.cookies.get(MY_TOKEN_KEY())?.value;

  const body = await request.json();
  const { prompt, html, previousPrompt, provider, selectedElementHtml, model } =
    body;

  if (!prompt || !html) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const selectedModel = MODELS.find(
    (m) => m.value === model || m.label === model
  );
  if (!selectedModel) {
    return NextResponse.json(
      { ok: false, error: "Invalid model selected" },
      { status: 400 }
    );
  }

  let token = userToken;
  let billTo: string | null = null;

  /**
   * Handle local usage token, this bypass the need for a user token
   * and allows local testing without authentication.
   * This is useful for development and testing purposes.
   */
  if (process.env.HF_TOKEN && process.env.HF_TOKEN.length > 0) {
    token = process.env.HF_TOKEN;
  }

  const rawFwd2 = authHeaders.get("x-forwarded-for");
  const ip = rawFwd2?.includes(",")
    ? rawFwd2.split(",")[1].trim()
    : rawFwd2 || "unknown";

  if (!token) {
    ipAddresses.set(ip, (ipAddresses.get(ip) || 0) + 1);
    if (ipAddresses.get(ip) > MAX_REQUESTS_PER_IP) {
      return NextResponse.json(
        {
          ok: false,
          openLogin: true,
          message: "Log In to continue using the service",
        },
        { status: 429 }
      );
    }

    token = process.env.DEFAULT_HF_TOKEN as string;
    billTo = "huggingface";
  }

  const client = new InferenceClient(token);

  const DEFAULT_PROVIDER = PROVIDERS.novita;
  const selectedProvider =
    provider === "auto"
      ? PROVIDERS[selectedModel.autoProvider as keyof typeof PROVIDERS]
      : PROVIDERS[provider as keyof typeof PROVIDERS] ?? DEFAULT_PROVIDER;

  try {
    const response = await client.chatCompletion(
      {
        model: selectedModel.value,
        provider: selectedProvider.id as any,
        messages: [
          {
            role: "system",
            content: FOLLOW_UP_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: previousPrompt
              ? previousPrompt
              : "You are modifying the HTML file based on the user's request.",
          },
          {
            role: "assistant",

            content: `The current code is: \n\`\`\`html\n${html}\n\`\`\` ${
              selectedElementHtml
                ? `\n\nYou have to update ONLY the following element, NOTHING ELSE: \n\n\`\`\`html\n${selectedElementHtml}\n\`\`\``
                : ""
            }`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        ...(selectedProvider.id !== "sambanova"
          ? {
              max_tokens: selectedProvider.max_tokens,
            }
          : {}),
      },
      billTo ? { billTo } : {}
    );

    const chunk = response.choices[0]?.message?.content;
    if (!chunk) {
      return NextResponse.json(
        { ok: false, message: "No content returned from the model" },
        { status: 400 }
      );
    }

    if (chunk) {
      const updatedLines: number[][] = [];
      let newHtml = html;
      let position = 0;
      let moreBlocks = true;

      while (moreBlocks) {
        const searchStartIndex = chunk.indexOf(SEARCH_START, position);
        if (searchStartIndex === -1) {
          moreBlocks = false;
          continue;
        }

        const dividerIndex = chunk.indexOf(DIVIDER, searchStartIndex);
        if (dividerIndex === -1) {
          moreBlocks = false;
          continue;
        }

        const replaceEndIndex = chunk.indexOf(REPLACE_END, dividerIndex);
        if (replaceEndIndex === -1) {
          moreBlocks = false;
          continue;
        }

        const searchBlock = chunk.substring(
          searchStartIndex + SEARCH_START.length,
          dividerIndex
        );
        const replaceBlock = chunk.substring(
          dividerIndex + DIVIDER.length,
          replaceEndIndex
        );

        if (searchBlock.trim() === "") {
          newHtml = `${replaceBlock}\n${newHtml}`;
          updatedLines.push([1, replaceBlock.split("\n").length]);
        } else {
          const blockPosition = newHtml.indexOf(searchBlock);
          if (blockPosition !== -1) {
            const beforeText = newHtml.substring(0, blockPosition);
            const startLineNumber = beforeText.split("\n").length;
            const replaceLines = replaceBlock.split("\n").length;
            const endLineNumber = startLineNumber + replaceLines - 1;

            updatedLines.push([startLineNumber, endLineNumber]);
            newHtml = newHtml.replace(searchBlock, replaceBlock);
          }
        }

        position = replaceEndIndex + REPLACE_END.length;
      }

      return NextResponse.json({
        ok: true,
        html: newHtml,
        updatedLines,
      });
    } else {
      return NextResponse.json(
        { ok: false, message: "No content returned from the model" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    if (error.message?.includes("exceeded your monthly included credits")) {
      return NextResponse.json(
        {
          ok: false,
          openProModal: true,
          message: error.message,
        },
        { status: 402 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        openSelectProvider: true,
        message:
          error.message || "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}
