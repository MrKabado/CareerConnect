import { useEffect, useState } from "react";
import mammoth from "mammoth";

export default function DocxTextPreview({ file }: { file: Blob }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void file.arrayBuffer()
      .then((arrayBuffer) => mammoth.extractRawText({ arrayBuffer }))
      .then((result) => {
        if (!active) return;
        if (!result.value.trim()) {
          setError("This DOCX file does not contain readable text.");
          return;
        }
        setText(result.value);
        setError(null);
      })
      .catch(() => {
        if (active) setError("This DOCX file could not be previewed.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [file]);

  if (isLoading) {
    return (
      <p className="p-6 text-center text-sm text-[#718586]" role="status">
        Preparing DOCX preview…
      </p>
    );
  }

  if (error) {
    return (
      <p className="p-6 text-sm text-[#a2534c]" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#f3f6f6] p-4">
      <article className="mx-auto min-h-full max-w-3xl rounded-lg bg-white p-8 shadow-sm max-[600px]:p-5">
        <p className="mb-5 text-[10px] text-[#829091]">
          Text extracted from the DOCX. Formatting and embedded images may differ from the original.
        </p>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-[#354346]">
          {text}
        </pre>
      </article>
    </div>
  );
}
