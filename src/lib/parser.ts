/**
 * Parses raw pasted course text into Quests -> Units, then generates Modules
 * (including mixed modules that combine Units from different Quests).
 *
 * Expected shape (whitespace / casing tolerant):
 *
 *   Quest 1: How to get clients
 *   Modules / Units:
 *   How to get clients (1) -> https://youtu.be/xxxx
 *   Quest 2: Subtitles
 *   Modules / Units:
 *   Subtitles (1) -> [https://youtu.be/yyyy]
 */

export type ParsedUnit = {
  title: string;
  youtubeUrl: string;
  videoId: string | null;
  order: number;
};

export type ParsedQuest = {
  title: string;
  order: number;
  units: ParsedUnit[];
};

export type GeneratedModule = {
  title: string;
  isMixed: boolean;
  /** Refers back to parsed units by `${questIndex}:${unitIndex}` */
  unitRefs: string[];
};

export type ParseResult = {
  quests: ParsedQuest[];
  modules: GeneratedModule[];
  unitCount: number;
  errors: string[];
};

const QUEST_RE = /^quest\s*(\d+)?\s*[:.\-]\s*(.+)$/i;
const HEADER_RE = /^modules?\s*\/?\s*units?\s*:?\s*$/i;
const UNIT_RE = /^(.*?)\s*(?:\((\d+)\))?\s*(?:->|→|=>)\s*(.+)$/;

export function extractVideoId(url: string): string | null {
  const cleaned = url.trim().replace(/^[[(<]+|[\])>]+$/g, "");
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|live)\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) return match[1];
  }
  return /^[\w-]{11}$/.test(cleaned) ? cleaned : null;
}

function cleanUrl(raw: string): string {
  return raw.trim().replace(/^[[(<]+|[\])>,.]+$/g, "");
}

export function parseCourseText(input: string): ParseResult {
  const errors: string[] = [];
  const quests: ParsedQuest[] = [];
  let current: ParsedQuest | null = null;

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const questMatch = line.match(QUEST_RE);
    if (questMatch) {
      current = { title: questMatch[2]!.trim(), order: quests.length, units: [] };
      quests.push(current);
      continue;
    }

    if (HEADER_RE.test(line)) continue;

    const unitMatch = line.match(UNIT_RE);
    if (unitMatch) {
      if (!current) {
        current = { title: "Unsorted", order: quests.length, units: [] };
        quests.push(current);
      }
      const url = cleanUrl(unitMatch[3]!);
      const title = unitMatch[1]!.trim() || `Unit ${current.units.length + 1}`;
      const videoId = extractVideoId(url);
      if (!videoId) errors.push(`Could not read a YouTube link for "${title}".`);
      current.units.push({ title, youtubeUrl: url, videoId, order: current.units.length });
      continue;
    }

    errors.push(`Skipped unrecognised line: "${line}"`);
  }

  const withUnits = quests.filter((quest) => quest.units.length > 0);
  withUnits.forEach((quest, index) => {
    quest.order = index;
  });

  return {
    quests: withUnits,
    modules: generateModules(withUnits),
    unitCount: withUnits.reduce((total, quest) => total + quest.units.length, 0),
    errors,
  };
}

/**
 * One core module per quest, plus mixed modules that pair units from two
 * different quests so learners cross-train (e.g. editing basics + subtitles).
 */
export function generateModules(quests: ParsedQuest[]): GeneratedModule[] {
  const modules: GeneratedModule[] = [];

  quests.forEach((quest, questIndex) => {
    modules.push({
      title: quest.title,
      isMixed: false,
      unitRefs: quest.units.map((_, unitIndex) => `${questIndex}:${unitIndex}`),
    });

    const previousIndex = questIndex - 1;
    const previous = quests[previousIndex];
    if (!previous) return;

    const mixed = [
      `${previousIndex}:${(questIndex - 1) % previous.units.length}`,
      `${questIndex}:0`,
    ];
    modules.push({
      title: `Mix: ${shorten(previous.title)} + ${shorten(quest.title)}`,
      isMixed: true,
      unitRefs: mixed,
    });
  });

  return modules;
}

function shorten(title: string, max = 22): string {
  return title.length <= max ? title : `${title.slice(0, max - 1).trimEnd()}…`;
}