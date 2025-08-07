import { useState, RefObject } from "react";
import { useMount, useUnmount } from "react-use";

interface ResizablePanelsArgs {
  editorRef: RefObject<HTMLDivElement>;
  previewRef: RefObject<HTMLDivElement>;
  resizerRef: RefObject<HTMLDivElement>;
}

export function useResizablePanels({
  editorRef,
  previewRef,
  resizerRef,
}: ResizablePanelsArgs) {
  const [isResizing, setIsResizing] = useState(false);

  const resetLayout = () => {
    if (!editorRef.current || !previewRef.current) return;

    if (window.innerWidth >= 1024) {
      const resizerWidth = resizerRef.current?.offsetWidth ?? 8;
      const availableWidth = window.innerWidth - resizerWidth;
      const initialEditorWidth = availableWidth / 3;
      const initialPreviewWidth = availableWidth - initialEditorWidth;
      editorRef.current.style.width = `${initialEditorWidth}px`;
      previewRef.current.style.width = `${initialPreviewWidth}px`;
    } else {
      editorRef.current.style.width = "";
      previewRef.current.style.width = "";
    }
  };

  const handleResize = (e: MouseEvent) => {
    if (!editorRef.current || !previewRef.current || !resizerRef.current) return;

    const resizerWidth = resizerRef.current.offsetWidth;
    const minWidth = 100;
    const maxWidth = window.innerWidth - resizerWidth - minWidth;

    const editorWidth = e.clientX;
    const clampedEditorWidth = Math.max(
      minWidth,
      Math.min(editorWidth, maxWidth)
    );
    const calculatedPreviewWidth =
      window.innerWidth - clampedEditorWidth - resizerWidth;

    editorRef.current.style.width = `${clampedEditorWidth}px`;
    previewRef.current.style.width = `${calculatedPreviewWidth}px`;
  };

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useMount(() => {
    resetLayout();
    if (resizerRef.current) {
      resizerRef.current.addEventListener("mousedown", handleMouseDown as EventListener);
    }
    window.addEventListener("resize", resetLayout);
  });

  useUnmount(() => {
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", handleMouseUp);
    if (resizerRef.current) {
      resizerRef.current.removeEventListener("mousedown", handleMouseDown as EventListener);
    }
    window.removeEventListener("resize", resetLayout);
  });

  return { isResizing };
}
