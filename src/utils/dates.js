/**
 * Today's date as YYYY-MM-DD in *local* time. All stored dates (session
 * logs, block startDate/lastDeloadDate) and all date comparisons must use
 * this, never toISOString(), which returns the UTC date and can disagree
 * with the user's calendar day around midnight.
 */
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
