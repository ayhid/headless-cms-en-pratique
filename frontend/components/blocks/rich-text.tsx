// Server component rendering the Strapi 5 "blocks" rich text format (blocks.rich-text component).
import type { ReactNode } from 'react';
import { strapiMediaUrl } from './media';
import type { RichTextBlock as RichTextBlockData, RichTextNode } from './types';

function renderText(node: RichTextNode, key: number): ReactNode {
  let content: ReactNode = node.text ?? '';
  if (node.code) content = <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800">{content}</code>;
  if (node.bold) content = <strong className="font-semibold">{content}</strong>;
  if (node.italic) content = <em>{content}</em>;
  if (node.underline) content = <u>{content}</u>;
  if (node.strikethrough) content = <s>{content}</s>;
  return <span key={key}>{content}</span>;
}

function renderChildren(nodes: RichTextNode[] | undefined): ReactNode[] {
  return (nodes ?? []).map((child, i) => renderNode(child, i));
}

const HEADING_CLASSES: Record<number, string> = {
  1: 'text-3xl font-bold',
  2: 'text-2xl font-bold',
  3: 'text-xl font-semibold',
  4: 'text-lg font-semibold',
  5: 'text-base font-semibold',
  6: 'text-sm font-semibold uppercase tracking-wide',
};

function renderNode(node: RichTextNode, key: number): ReactNode {
  switch (node.type) {
    case 'text':
      return renderText(node, key);
    case 'paragraph':
      return (
        <p key={key} className="leading-7">
          {renderChildren(node.children)}
        </p>
      );
    case 'heading': {
      const level = Math.min(Math.max(node.level ?? 2, 1), 6);
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return (
        <Tag key={key} className={`mt-2 tracking-tight ${HEADING_CLASSES[level]}`}>
          {renderChildren(node.children)}
        </Tag>
      );
    }
    case 'list': {
      const ordered = node.format === 'ordered';
      const Tag = ordered ? 'ol' : 'ul';
      return (
        <Tag key={key} className={`flex flex-col gap-1 pl-6 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {renderChildren(node.children)}
        </Tag>
      );
    }
    case 'list-item':
      return <li key={key}>{renderChildren(node.children)}</li>;
    case 'link':
      return (
        <a
          key={key}
          href={node.url}
          className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400"
        >
          {renderChildren(node.children)}
        </a>
      );
    case 'quote':
      return (
        <blockquote key={key} className="border-l-4 border-zinc-300 pl-4 italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {renderChildren(node.children)}
        </blockquote>
      );
    case 'code':
      return (
        <pre key={key} className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
          <code>{(node.children ?? []).map((c) => c.text ?? '').join('')}</code>
        </pre>
      );
    case 'image': {
      const src = strapiMediaUrl(node.image?.url);
      if (!src) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element -- Strapi origin varies per environment (port), see media.ts
        <img
          key={key}
          src={src}
          alt={node.image?.alternativeText ?? ''}
          width={node.image?.width ?? undefined}
          height={node.image?.height ?? undefined}
          className="h-auto w-full rounded-lg"
          loading="lazy"
        />
      );
    }
    default:
      // Unknown node type: keep its text content rather than dropping it.
      return <span key={key}>{renderChildren(node.children)}</span>;
  }
}

export function RichTextBlock({ block }: { block: RichTextBlockData }) {
  if (!block.body || block.body.length === 0) return null;
  return (
    <div data-block="blocks.rich-text" className="flex flex-col gap-4 text-zinc-800 dark:text-zinc-200">
      {block.body.map((node, i) => renderNode(node, i))}
    </div>
  );
}
