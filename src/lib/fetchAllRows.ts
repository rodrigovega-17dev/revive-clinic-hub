// PostgREST silently caps every response (1000 rows on this project), so any query that can
// return more rows must be paged. The caller supplies the query for a given row window and must
// order it by a unique column, or rows can repeat/skip between pages.
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  // Advance by what actually came back and stop only on an empty page, so a server cap lower
  // than pageSize can't silently truncate the result again.
  for (let from = 0; ; ) {
    const { data, error } = await queryPage(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) return rows;
    rows.push(...data);
    from += data.length;
  }
}
