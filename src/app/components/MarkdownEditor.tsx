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

  return (
    <>
      <div
        className="ui top attached tabular menu"
        style={{ marginTop: "1em" }}
      >
        <a
          className={`item ${activeTab === "write" ? "active" : ""}`}
          onClick={() => setActiveTab("write")}
          style={{ cursor: "pointer" }}
        >
          Write
        </a>
        <a
          className={`item ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
          style={{ cursor: "pointer" }}
        >
          Preview
        </a>
      </div>

      <div
        className="ui bottom attached segment"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginTop: 0,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {activeTab === "write"
          ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <textarea
                style={{
                  flex: 1,
                  width: "100%",
                  height: "100%",
                  resize: "none",
                  fontFamily: "monospace",
                  border: "none",
                  outline: "none",
                  borderRadius: 0,
                  padding: "1em",
                }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start editing markdown body..."
                readOnly={isPrLocked}
                disabled={isPrLocked}
              />
            </div>
          )
          : (
            <div
              style={{
                overflowY: "auto",
                height: "100%",
                padding: "1em",
              }}
            >
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
    </>
  );
};
