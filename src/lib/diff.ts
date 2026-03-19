export interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
  originalText?: string;
}

export function computeWordDiff(
  original: string,
  corrected: string
): DiffSegment[] {
  const origWords = original.split(/\s+/);
  const corrWords = corrected.split(/\s+/);

  const m = origWords.length;
  const n = corrWords.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === corrWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffSegment[] = [];
  let i = m,
    j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === corrWords[j - 1]) {
      result.push({ type: "equal", text: corrWords[j - 1], originalText: origWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "added", text: corrWords[j - 1] });
      j--;
    } else {
      result.push({ type: "removed", text: origWords[i - 1] });
      i--;
    }
  }

  result.reverse();

  const segments: DiffSegment[] = [];
  for (const seg of result) {
    if (segments.length > 0 && segments[segments.length - 1].type === seg.type) {
      segments[segments.length - 1].text += " " + seg.text;
      if (seg.originalText) {
        segments[segments.length - 1].originalText =
          (segments[segments.length - 1].originalText || "") + " " + seg.originalText;
      }
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}
