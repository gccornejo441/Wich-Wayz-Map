import { useCallback, useEffect, useRef, useState } from "react";

const SHARED_CONTEXT =
  "Short shop descriptions for Wich Wayz, a local business directory. " +
  "Descriptions should be friendly, concise (1-2 sentences), and highlight what makes the shop special.";

export function useChromeAI() {
  const [writerAvailable, setWriterAvailable] = useState(false);
  const [rewriterAvailable, setRewriterAvailable] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      if ("Writer" in self) {
        const status = await Writer.availability();
        if (!cancelled && status !== "unavailable") setWriterAvailable(true);
      }
      if ("Rewriter" in self) {
        const status = await Rewriter.availability();
        if (!cancelled && status !== "unavailable") setRewriterAvailable(true);
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const generateDescription = useCallback(
    async (shopName: string, categories: string[]): Promise<string | null> => {
      if (!writerAvailable || !shopName.trim()) return null;

      abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsGenerating(true);
      try {
        const writer = await Writer.create({
          tone: "casual",
          format: "plain-text",
          length: "short",
          sharedContext: SHARED_CONTEXT,
          signal: controller.signal,
        });

        const categoryList = categories.length
          ? ` in the ${categories.join(", ")} category`
          : "";

        const result = await writer.write(
          `Write a short shop description for "${shopName}"${categoryList}.`,
          { signal: controller.signal },
        );

        writer.destroy();
        return result;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return null;
        throw e;
      } finally {
        setIsGenerating(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [writerAvailable, abort],
  );

  const rewriteDescription = useCallback(
    async (
      text: string,
      shopName: string,
      categories: string[],
    ): Promise<string | null> => {
      if (!rewriterAvailable || !text.trim()) return null;

      abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRewriting(true);
      try {
        const rewriter = await Rewriter.create({
          tone: "as-is",
          format: "plain-text",
          length: "as-is",
          sharedContext: SHARED_CONTEXT,
          signal: controller.signal,
        });

        const categoryList = categories.length
          ? ` (categories: ${categories.join(", ")})`
          : "";

        const result = await rewriter.rewrite(text, {
          context: `This is a description for a shop called "${shopName}"${categoryList}. Improve clarity and appeal while keeping it concise.`,
          signal: controller.signal,
        });

        rewriter.destroy();
        return result;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return null;
        throw e;
      } finally {
        setIsRewriting(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [rewriterAvailable, abort],
  );

  useEffect(() => {
    return () => abort();
  }, [abort]);

  return {
    writerAvailable,
    rewriterAvailable,
    isGenerating,
    isRewriting,
    generateDescription,
    rewriteDescription,
    abort,
  };
}
