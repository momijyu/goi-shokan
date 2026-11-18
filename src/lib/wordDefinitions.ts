"use client";

import { getDictFileUrl } from "@/lib/dictConfig";

export interface WordDefinitionLookupResult {
  defs: string[];
  source: "wordnet" | "derived" | null;
}

/**
 * Fetches a possibly-gzipped static text dictionary asset and returns UTF-8 text.
 */
export async function fetchPossiblyGzippedText(url: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const isGzipMagic = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (isGzipMagic && typeof DecompressionStream !== "undefined") {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).text();
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

let wordNetDefsPromise: Promise<Map<string, string[]>> | null = null;

/**
 * Lazily loads Japanese WordNet v2.1 definitions from /dict/wnja_defs.tsv.gz.
 */
export async function getWordNetDefinitionsMap(): Promise<Map<string, string[]>> {
  if (typeof window === "undefined") return new Map();
  if (!wordNetDefsPromise) {
    wordNetDefsPromise = fetchPossiblyGzippedText(getDictFileUrl("wnja_defs.tsv.gz"))
      .then((text) => {
        const map = new Map<string, string[]>();
        if (!text) return map;
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line || line.startsWith("#")) continue;
          const parts = line.split("\t");
          const term = parts[0];
          const defs = parts.slice(1).filter(Boolean);
          if (term && defs.length > 0) {
            map.set(term, defs);
          }
        }
        return map;
      })
      .catch(() => new Map<string, string[]>());
  }
  return wordNetDefsPromise;
}

const ORTHOGRAPHY_ALIASES: Record<string, string[]> = {
  儚い: ["果敢無い"],
  悲しい: ["哀しい"],
  良い: ["善い"],
  悔しい: ["口惜しい"],
  未曾有: ["未曽有"],
  生贄: ["生け贄", "犠牲"],
};

export async function lookupWordDefinitions(
  term: string
): Promise<WordDefinitionLookupResult> {
  const map = await getWordNetDefinitionsMap();

  const direct = map.get(term) ?? map.get(term.toLowerCase());
  if (direct && direct.length > 0) {
    return { defs: direct, source: "wordnet" };
  }

  const aliases = ORTHOGRAPHY_ALIASES[term] ?? [];
  for (const alt of aliases) {
    const found = map.get(alt);
    if (found && found.length > 0) {
      return { defs: found, source: "wordnet" };
    }
  }

  // Fallback for common Japanese compound suffixes (〇〇的 / 〇〇性 / 〇〇化 / 〇〇感)
  const suffixRules: [string, string][] = [
    ["的", "のような性質・傾向を帯びたさま"],
    ["性", "としての性質・度合い"],
    ["化", "へと変化・移行すること"],
    ["感", "を伴う感覚・印象"],
  ];
  for (const [suffix, desc] of suffixRules) {
    if (term.endsWith(suffix) && term.length >= 3) {
      const stem = term.slice(0, -suffix.length);
      const stemDefs = map.get(stem);
      if (stemDefs && stemDefs.length > 0) {
        return {
          defs: [`「${stem}」${desc}`, `${stem}：${stemDefs[0]}`],
          source: "derived",
        };
      }
    }
  }

  return { defs: [], source: null };
}
