import classNames from "classnames";
import { useRef } from "react";
import { TbReload } from "react-icons/tb";
import { toast } from "react-toastify";
import { FaLaptopCode } from "react-icons/fa6";
import { defaultHTML } from "../../../utils/consts";

function Preview({
  html,
  isResizing,
  isAiWorking,
  setView,
  ref,
}: {
  html: string;
  isResizing: boolean;
  isAiWorking: boolean;
  setView: React.Dispatch<React.SetStateAction<"editor" | "preview">>;
  ref: React.RefObject<HTMLDivElement | null>;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const handleRefreshIframe = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const content = iframe.srcdoc;
      iframe.srcdoc = "";
      setTimeout(() => {
        iframe.srcdoc = content;
      }, 10);
    }
  };

  return (
    <div
      ref={ref}
      className="w-full border-l border-gray-900 bg-white h-[calc(100dvh-49px)] lg:h-[calc(100dvh-53px)] relative"
      onClick={(e) => {
        if (isAiWorking) {
          e.preventDefault();
          e.stopPropagation();
          toast.warn("Please wait for the AI to finish working.");
        }
      }}
    >
      <iframe
        ref={iframeRef}
        title="output"
        className={classNames("w-full h-full select-none", {
          "pointer-events-none": isResizing || isAiWorking,
        })}
        srcDoc={html}
      />
      <div className="flex items-center justify-start gap-3 absolute bottom-3 lg:bottom-5 max-lg:left-3 lg:right-5">
        <button
          className="lg:hidden bg-gray-950 shadow-md text-white text-xs lg:text-sm font-medium py-2 px-3 lg:px-4 rounded-lg flex items-center gap-2 border border-gray-900 hover:brightness-150 transition-all duration-100 cursor-pointer"
          onClick={() => setView("editor")}
        >
          <FaLaptopCode className="text-sm" />
          Hide preview
        </button>
        {html === defaultHTML && (
          <a
            href="https://huggingface.co/spaces/victor/deepsite-gallery"
            target="_blank"
            className="bg-gray-200 text-gray-950 text-xs lg:text-sm font-medium py-2 px-3 lg:px-4 rounded-lg flex items-center gap-2 border border-gray-200 hover:bg-gray-300 transition-all duration-100 cursor-pointer"
          >
            🖼️ <span>LocalSite Gallery</span>
          </a>
        )}
        {!isAiWorking && (
          <button
            className="bg-white lg:bg-gray-950 shadow-md text-gray-950 lg:text-white text-xs lg:text-sm font-medium py-2 px-3 lg:px-4 rounded-lg flex items-center gap-2 border border-gray-100 lg:border-gray-900 hover:brightness-150 transition-all duration-100 cursor-pointer"
            onClick={handleRefreshIframe}
          >
            <TbReload className="text-sm" />
            Refresh Preview
          </button>
        )}
      </div>
    </div>
  );
}

export default Preview;
