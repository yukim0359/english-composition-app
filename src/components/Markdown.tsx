"use client";

function parseLine(line: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }

    if (match[2]) {
      nodes.push(
        <strong key={key++}>
          <em>{match[2]}</em>
        </strong>
      );
    } else if (match[3]) {
      nodes.push(<strong key={key++}>{match[3]}</strong>);
    } else if (match[4]) {
      nodes.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      nodes.push(
        <code
          key={key++}
          className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs font-mono"
        >
          {match[5]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes;
}

export default function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed === "") {
          return <div key={i} className="h-1" />;
        }

        const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-1.5 ml-1">
              <span className="text-blue-400 shrink-0">•</span>
              <span>{parseLine(bulletMatch[1])}</span>
            </div>
          );
        }

        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-1.5 ml-1">
              <span className="text-blue-400 shrink-0">
                {numberedMatch[1]}.
              </span>
              <span>{parseLine(numberedMatch[2])}</span>
            </div>
          );
        }

        return <p key={i}>{parseLine(trimmed)}</p>;
      })}
    </div>
  );
}
