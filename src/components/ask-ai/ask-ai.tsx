/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { RiSparkling2Fill } from "react-icons/ri";
import { GrSend } from "react-icons/gr";
// import classNames supprimé car non utilisé après retrait de la popup login
import { toast } from "react-toastify";
import { useLocalStorage } from "react-use";
import { MdPreview } from "react-icons/md";

// import Login supprimé car non utilisé après retrait des limitations
import { defaultHTML } from "./../../../utils/consts";
import SuccessSound from "./../../assets/success.mp3";
import Settings from "../settings/settings";
// Import ProModal supprimé car non utilisé en mode local
// import SpeechPrompt from "../speech-prompt/speech-prompt";

function AskAI({
  html,
  setHtml,
  onScrollToBottom,
  isAiWorking,
  setisAiWorking,
  setView,
  onNewPrompt,
}: {
  html: string;
  setHtml: (html: string) => void;
  onScrollToBottom: () => void;
  isAiWorking: boolean;
  onNewPrompt: (prompt: string) => void;
  setView: React.Dispatch<React.SetStateAction<"editor" | "preview">>;
  setisAiWorking: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // variables liées au login supprimées car nous utilisons Ollama en local
  const [prompt, setPrompt] = useState("");
  const [hasAsked, setHasAsked] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState("");
  const [provider, setProvider] = useLocalStorage("provider", "auto");
  const [openProvider, setOpenProvider] = useState(false);
  const [providerError, setProviderError] = useState("");
  // Variables de modal supprimées car non utilisées en mode local

  const audio = new Audio(SuccessSound);
  audio.volume = 0.5;

  const callAi = async () => {
    if (isAiWorking || !prompt.trim()) return;
    setisAiWorking(true);
    setProviderError("");

    let contentResponse = "";
    let lastRenderTime = 0;
    try {
      onNewPrompt(prompt);
      const request = await fetch("/api/ask-ai", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          provider,
          ...(html === defaultHTML ? {} : { html }),
          ...(previousPrompt ? { previousPrompt } : {}),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (request && request.body) {
        if (!request.ok) {
          const res = await request.json();
          if (res.openSelectProvider) {
            setOpenProvider(true);
            setProviderError(res.message);
          // Suppression de la vérification pour le mode pro/login
          } else {
            toast.error(res.message);
          }
          setisAiWorking(false);
          return;
        }
        const reader = request.body.getReader();
        const decoder = new TextDecoder("utf-8");

        const read = async () => {
          const { done, value } = await reader.read();
          if (done) {
            toast.success("AI responded successfully");
            setPrompt("");
            setPreviousPrompt(prompt);
            setisAiWorking(false);
            setHasAsked(true);
            audio.play();
            setView("preview");

            // Now we have the complete HTML including </html>, so set it to be sure
            const finalDoc = contentResponse.match(
              /<!DOCTYPE html>[\s\S]*<\/html>/
            )?.[0];
            if (finalDoc) {
              setHtml(finalDoc);
            }

            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          contentResponse += chunk;
          const newHtml = contentResponse.match(/<!DOCTYPE html>[\s\S]*/)?.[0];
          if (newHtml) {
            // Force-close the HTML tag so the iframe doesn't render half-finished markup
            let partialDoc = newHtml;
            if (!partialDoc.includes("</html>")) {
              partialDoc += "\n</html>";
            }

            // Throttle the re-renders to avoid flashing/flicker
            const now = Date.now();
            if (now - lastRenderTime > 300) {
              setHtml(partialDoc);
              lastRenderTime = now;
            }

            if (partialDoc.length > 200) {
              onScrollToBottom();
            }
          }
          read();
        };

        read();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setisAiWorking(false);
      toast.error(error.message);
      // Login popup supprimé car nous utilisons Ollama en local
    }
  };

  return (
    <div
      className={`bg-gray-950 rounded-xl py-2 lg:py-2.5 pl-3.5 lg:pl-4 pr-2 lg:pr-2.5 absolute lg:sticky bottom-3 left-3 lg:bottom-4 lg:left-4 w-[calc(100%-1.5rem)] lg:w-[calc(100%-2rem)] z-10 group ${
        isAiWorking ? "animate-pulse" : ""
      }`}
    >
      {defaultHTML !== html && (
        <button
          className="bg-white lg:hidden -translate-y-[calc(100%+8px)] absolute left-0 top-0 shadow-md text-gray-950 text-xs font-medium py-2 px-3 lg:px-4 rounded-lg flex items-center gap-2 border border-gray-100 hover:brightness-150 transition-all duration-100 cursor-pointer"
          onClick={() => setView("preview")}
        >
          <MdPreview className="text-sm" />
          View Preview
        </button>
      )}
      <div className="w-full relative flex items-center justify-between">
        <RiSparkling2Fill className="text-lg lg:text-xl text-gray-500 group-focus-within:text-pink-500" />
        <input
          type="text"
          disabled={isAiWorking}
          className="w-full bg-transparent max-lg:text-sm outline-none px-3 text-white placeholder:text-gray-500 font-code"
          placeholder={
            hasAsked ? "What do you want to ask AI next?" : "Ask AI anything..."
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              callAi();
            }
          }}
        />
        <div className="flex items-center justify-end gap-2">
          {/* <SpeechPrompt setPrompt={setPrompt} /> */}
          <Settings
            provider={provider as string}
            onChange={setProvider}
            open={openProvider}
            error={providerError}
            onClose={setOpenProvider}
          />
          <button
            disabled={isAiWorking}
            className="relative overflow-hidden cursor-pointer flex-none flex items-center justify-center rounded-full text-sm font-semibold size-8 text-center bg-pink-500 hover:bg-pink-400 text-white shadow-sm dark:shadow-highlight/20 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
            onClick={callAi}
          >
            <GrSend className="-translate-x-[1px]" />
          </button>
        </div>
      </div>
      {/* Login popup supprimé car nous utilisons Ollama en local */}
      {/* Modal de login supprimée pour le mode Ollama 100% local */}
    </div>
  );
}

export default AskAI;
