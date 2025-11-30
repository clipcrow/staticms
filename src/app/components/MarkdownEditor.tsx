import React, { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vscDarkPlus from "prism-style";

interface MarkdownEditorProps {
  body: string;
  setBody: (body: string) => void;
  isPrLocked: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  body,
  setBody,
  isPrLocked,
}) => {
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">(
    "write",
  );
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    if (activeTab === "write" && textareaRef.current) {
      const parent = textareaRef.current.parentElement;
      if (parent) {
        textareaRef.current.style.height = `${parent.clientHeight}px`;
      }
    }
  }, [activeTab]);

  return (
    <div className="staticms-md-editor-root">
      <div className="ui top attached tabular menu staticms-md-tab-menu">
        <a
          className={`item staticms-md-tab-item ${
            activeTab === "write" ? "active" : ""
          }`}
          onClick={() => setActiveTab("write")}
        >
          Write
        </a>
        <a
          className={`item staticms-md-tab-item ${
            activeTab === "preview" ? "active" : ""
          }`}
          onClick={() => setActiveTab("preview")}
        >
          Preview
        </a>
      </div>

      <div className="ui bottom attached segment staticms-md-bottom-segment">
        {activeTab === "write"
          ? (
            <div className="staticms-md-write-container">
              <textarea
                ref={textareaRef}
                className="staticms-md-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start editing markdown body..."
                readOnly={isPrLocked}
                disabled={isPrLocked}
              />
            </div>
          )
          : (
            <div className="staticms-md-preview-container">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(
                    props: ComponentPropsWithoutRef<"code"> & {
                      inline?: boolean;
                      node?: unknown;
                    },
                  ) {
                    const {
                      children,
                      className,
                      inline,
                      node: _node,
                      ...rest
                    } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match
                      ? (
                        <SyntaxHighlighter
                          {...rest}
                          PreTag="div"
                          language={match[1]}
                          style={vscDarkPlus}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      )
                      : (
                        <code {...rest} className={className}>
                          {children}
                        </code>
                      );
                  },
                  table(props: ComponentPropsWithoutRef<"table">) {
                    return <table className="ui celled table" {...props} />;
                  },
                }}
              >
                {body}
              </ReactMarkdown>
            </div>
          )}
      </div>
    </div>
  );
};
