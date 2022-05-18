/* global AbortController */
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'
import { fetch } from 'whatwg-fetch'
import retryingFetch from './retrying-fetch'

let browserFetch = false

if (window && window.fetch && ('signal' in new window.Request(''))) {
  browserFetch = window.fetch
} else {
  browserFetch = fetch
}

function tenaciousFetch (url = '', config = {}) {
  const controller = new AbortController()

  config = Object.assign({
    retries: 1,
    retryDelay: 1000,
    retryStatus: [],
    retryOnFatalError: true,
    fetcher: browserFetch,
    signal: controller.signal,
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
          () => {
            controller.abort()
            reject(
              new Error(
                `tenacious-fetch: Request took longer than timeout of ${timeout} ms.`
              )
            )
          },
          timeout
        )
      )
    ])
  }

  return retryingFetch(config.retries, url, config)
}

export default tenaciousFetch
