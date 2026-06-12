// Batched fetching with exponential backoff, to stay under Hiro API rate
// limits when campaign count grows (one read-only call per campaign).

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function withBackoff<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 500): Promise<T> {
  let attempt = 0
  for (;;) {
    try {
      return await fn()
    } catch (error) {
      attempt++
      if (attempt > retries) throw error
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
}

export async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    results.push(...(await Promise.all(batch.map((item) => withBackoff(() => fn(item))))))
  }
  return results
}
