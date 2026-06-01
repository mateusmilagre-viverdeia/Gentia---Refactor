import ReactMarkdown from "react-markdown";
import { ContentBlock } from "@/lib/parseContentBlocks";
import { cn } from "@/lib/utils";

interface SellingContentSectionProps {
  block: ContentBlock;
  primaryColor?: string;
  className?: string;
}

export function SellingContentSection({ 
  block, 
  primaryColor = "#000000",
  className 
}: SellingContentSectionProps) {
  if (!block.content) return null;

  return (
    <section className={cn("py-8", className)}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header with Emoji */}
          <div className="flex items-center gap-3 mb-6">
            {block.emoji && (
              <span className="text-3xl">{block.emoji}</span>
            )}
            <h2 
              className="text-2xl font-bold"
              style={{ color: primaryColor }}
            >
              {block.title}
            </h2>
          </div>

          {/* Markdown Content */}
          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h3 className="text-xl font-semibold mt-6 mb-3" style={{ color: primaryColor }}>
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h4 className="text-lg font-semibold mt-4 mb-2" style={{ color: primaryColor }}>
                    {children}
                  </h4>
                ),
                h3: ({ children }) => (
                  <h5 className="text-base font-semibold mt-3 mb-2">
                    {children}
                  </h5>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 my-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 my-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-muted-foreground">
                    {children}
                  </li>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
                blockquote: ({ children }) => (
                  <blockquote 
                    className="border-l-4 pl-4 italic my-4 text-muted-foreground"
                    style={{ borderColor: primaryColor }}
                  >
                    {children}
                  </blockquote>
                ),
              }}
            >
              {block.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </section>
  );
}
