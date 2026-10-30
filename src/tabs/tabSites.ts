// Tab sites to search in the browser (their APIs are private): Songs → Add a song and search both use them.
export const TAB_SITES = [
  { id: 'songsterr', label: 'Songsterr', url: (q: string) => `https://www.songsterr.com/?pattern=${encodeURIComponent(q)}` },
  { id: 'ug', label: 'Ultimate Guitar', url: (q: string) => `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}` },
  { id: 'gp', label: 'Guitar Pro files', url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`${q} guitar pro tab gp5 OR gpx OR gp download`)}` },
]
