/**
 * True when every character of `query` appears in `text`, in order
 * (a subsequence match, not necessarily contiguous). Case-insensitive.
 */
export function fuzzyMatch(text, query) {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    ti = t.indexOf(q[qi], ti);
    if (ti === -1) return false;
    ti++;
  }
  return true;
}

/**
 * Filters `items` to those whose `getText(item)` fuzzy-matches `query`, then
 * ranks plain substring matches (and earlier matches) above subsequence-only
 * matches. Small-scale local search — no library needed for a command
 * palette with a few dozen entries at most.
 */
export function fuzzyFilter(items, query, getText) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items
    .filter(item => fuzzyMatch(getText(item), query))
    .sort((a, b) => {
      const aIndex = getText(a).toLowerCase().indexOf(q);
      const bIndex = getText(b).toLowerCase().indexOf(q);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
}
