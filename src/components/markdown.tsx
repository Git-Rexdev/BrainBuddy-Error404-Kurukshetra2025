"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default function Markdown({ content }: { content: string }) {
  // fix escaped newlines coming from JSON strings
  const text = content.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
          pre: (props) => <pre className="rounded-lg border p-3 overflow-auto" {...props} />,
          code: (props) => <code className="px-1 py-0.5 rounded bg-muted" {...props} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
