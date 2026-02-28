/**
 * Splits the query and fragment from a URL.
 *
 * The returned search value will include the leading question mark if a
 * search is present in the URL, and otherwise be the empty string.
 *
 * The returned hash value will include the leading hash mark if a hash is
 * present in the URL, and otherwise be the empty string.
 *
 * @returns a tuple containing the base URL, search, and hash.
 */
export function urlSplit(url: string): [base: string, search: string, hash: string] {
  const h = url.indexOf("#");
  const baseAndSearch = h < 0 ? url : url.slice(0, h);
  const hash = h < 0 ? "" : url.slice(h);

  const q = url.indexOf("?");
  const base = q < 0 ? baseAndSearch : baseAndSearch.slice(0, q);
  const search = q < 0 ? "" : baseAndSearch.slice(q);

  return [base, search, hash];
}
