import retryingFetch from './retrying-fetch'

let browserFetch = false

try {
  browserFetch = window && window.fetch
} catch (error) {}

function tenaciousFetch (url = '', config = {}) {
  config = Object.assign({
    retries: 1,
    retryDelay: 1000,
    retryStatus: [],
    fetcher: browserFetch,
    timeout: undefined
  }, config)

  if (!config.fetcher || typeof config.fetcher !== 'function') {
    throw new Error(
      'tenacious-fetch: No fetch implementation found. Provide a valid fetch implementation via the fetcher configuration property.'
    )
  }

  if (typeof config.retryStatus === 'string' || typeof config.retryStatus === 'number') {
    config.retryStatus = [Number.parseInt(config.retryStatus)]
  }

  const timeout = config.timeout

  if (timeout && Number.isInteger(timeout)) {
    return Promise.race([
      retryingFetch(config.retries, url, config),
      new Promise((resolve, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `tenacious-fetch: Request took longer than timeout of ${timeout} ms.`
              )
            ),
          timeout
        )
      )
    ])
  }

  return retryingFetch(config.retries, url, config)
}

export default tenaciousFetch
