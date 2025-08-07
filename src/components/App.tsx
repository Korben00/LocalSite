import { useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import classNames from "classnames";
import { editor } from "monaco-editor";
import { useMount, useEvent, useLocalStorage } from "react-use";
import { toast } from "react-toastify";

import Header from "./header/header";
import { defaultHTML } from "./../../utils/consts";
import Tabs from "./tabs/tabs";
import AskAI from "./ask-ai/ask-ai";
import Preview from "./preview/preview";
import { useResizablePanels } from "../hooks/useResizablePanels";

function App() {
  const [htmlStorage, , removeHtmlStorage] = useLocalStorage("html_content");

  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const { isResizing } = useResizablePanels({
    editorRef,
    previewRef,
    resizerRef,
  });

  const [html, setHtml] = useState((htmlStorage as string) ?? defaultHTML);
  const [isAiWorking, setisAiWorking] = useState(false);
  const [currentView, setCurrentView] = useState<"editor" | "preview">(
    "editor"
  );

  // Prevent accidental navigation away when AI is working or content has changed
  useEvent("beforeunload", (e) => {
    if (isAiWorking || html !== defaultHTML) {
      e.preventDefault();
      return "";
    }
  });

  // Initialize component on mount
  useMount(() => {
    // Restore content from storage if available
    if (htmlStorage) {
      removeHtmlStorage();
      toast.warn("Previous HTML content restored from local storage.");
    }
  });

  return (
    <div className="h-screen bg-gray-950 font-sans overflow-hidden">
      <Header
        onReset={() => {
          if (isAiWorking) {
            toast.warn("Please wait for the AI to finish working.");
            return;
          }
          if (
            window.confirm("You're about to reset the editor. Are you sure?")
          ) {
            setHtml(defaultHTML);
            removeHtmlStorage();
            monacoEditorRef.current?.revealLine(
              monacoEditorRef.current?.getModel()?.getLineCount() ?? 0
            );
          }
        }}
      />
      <main className="max-lg:flex-col flex w-full">
        <div
          ref={editorRef}
          className={classNames(
            "w-full h-[calc(100dvh-49px)] lg:h-[calc(100dvh-54px)] relative overflow-hidden max-lg:transition-all max-lg:duration-200 select-none",
            {
              "max-lg:h-0": currentView === "preview",
            }
          )}
        >
          <Tabs />
          <div
            onClick={(e) => {
              if (isAiWorking) {
                e.preventDefault();
                e.stopPropagation();
                toast.warn("Please wait for the AI to finish working.");
              }
            }}
          >
            <Editor
              language="html"
              theme="vs-dark"
              className={classNames(
                "h-[calc(100dvh-90px)] lg:h-[calc(100dvh-96px)]",
                {
                  "pointer-events-none": isAiWorking,
                }
              )}
              value={html}
              onChange={(value) => {
                const newValue = value ?? "";
                setHtml(newValue);
              }}
              onMount={(editor) => (monacoEditorRef.current = editor)}
            />
          </div>
          <AskAI
            html={html}
            setHtml={setHtml}
            isAiWorking={isAiWorking}
            setisAiWorking={setisAiWorking}
            setView={setCurrentView}
            onNewPrompt={() => {
              // Simplified prompt management for local mode
            }}
            onScrollToBottom={() => {
              monacoEditorRef.current?.revealLine(
                monacoEditorRef.current?.getModel()?.getLineCount() ?? 0
              );
            }}
          />
        </div>
        <div
          ref={resizerRef}
          className="bg-gray-700 hover:bg-blue-500 w-2 cursor-col-resize h-[calc(100dvh-53px)] max-lg:hidden"
        />
        <Preview
          html={html}
          isResizing={isResizing}
          isAiWorking={isAiWorking}
          ref={previewRef}
          setView={setCurrentView}
        />
      </main>
    </div>
  );
}

export default App;
