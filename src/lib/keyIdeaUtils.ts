import type { KeyIdea } from '@/types/backend';

/** Parse markdown-bold keywords (**...**) into fill-in blanks */
export function parseKeyPointToKeyIdea(raw: string): KeyIdea {
  const blanks: string[] = [];
  const text = raw.replace(/\*\*(.+?)\*\*/g, (_match, kw: string) => {
    const cleaned = kw.trim();
    if (cleaned) blanks.push(cleaned);
    return '__KEY__';
  });
  return { text, blanks };
}

/** Convert KeyIdea back to raw string */
export function keyIdeaToRaw(idea: KeyIdea): string {
  const parts = idea.text.split('__KEY__');
  return parts
    .map((p, i) => p + (i < (idea.blanks?.length ?? 0) ? `**${idea.blanks![i]}**` : ''))
    .join('');
}

export function keyIdeasToText(ideas: KeyIdea[]): string {
  return ideas.map((idea) => keyIdeaToRaw(idea)).join('\n');
}

/** Convert text to KeyIdeas, optionally preserving imageUrls by index */
export function textToKeyIdeas(text: string, preserveFrom?: KeyIdea[]): KeyIdea[] {
  const parsed = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseKeyPointToKeyIdea(line));
  if (!preserveFrom?.length) return parsed;
  return parsed.map((idea, idx) => ({
    ...idea,
    imageUrl: preserveFrom[idx]?.imageUrl ?? idea.imageUrl,
  }));
}
