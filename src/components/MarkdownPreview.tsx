import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isSafeMarkdownHref } from "../lib/markdownTaskToggle";

export interface MarkdownPreviewProps {
  content: string;
  interactive?: boolean;
  onToggleTask?: (taskIndex: number) => void;
  emptyText?: string;
  className?: string;
}

export function MarkdownPreview({
  content,
  interactive = false,
  onToggleTask,
  emptyText = "빈 본문입니다.",
  className = "",
}: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className={`markdown-preview ${className}`.trim()}>
        <p className="markdown-preview__empty">{emptyText}</p>
      </div>
    );
  }

  let checkboxIndex = 0;

  return (
    <div className={`markdown-preview ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (!isSafeMarkdownHref(href)) {
              return <span>{children}</span>;
            }
            const trimmedHref = href?.trim() ?? "";
            const isInPageHash = trimmedHref.startsWith("#");
            return (
              <a
                href={trimmedHref}
                target={isInPageHash ? undefined : "_blank"}
                rel={isInPageHash ? undefined : "noopener noreferrer"}
              >
                {children}
              </a>
            );
          },
          input({ type, checked }) {
            if (type !== "checkbox") {
              return <input type={type} readOnly />;
            }

            const currentIndex = checkboxIndex;
            checkboxIndex += 1;
            const canToggle = interactive && Boolean(onToggleTask);

            return (
              <input
                type="checkbox"
                checked={Boolean(checked)}
                disabled={!canToggle}
                aria-label={`할 일 항목 ${currentIndex + 1}`}
                onChange={() => {
                  if (canToggle && onToggleTask) {
                    onToggleTask(currentIndex);
                  }
                }}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
