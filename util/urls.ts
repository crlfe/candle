export function urlSplitSearch(url: string): [pathname: string, search: string] {
  const q = url.indexOf("?");
  if (q < 0) {
    return [url, ""];
  } else {
    return [url.slice(0, q), url.slice(q)];
  }
}
