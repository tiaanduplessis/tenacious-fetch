import {linear, exponential} from './backoff'

export default function retryingFetch (retries, url, config) {
  return new Promise((resolve, reject) => {
    function retryAttempt (retriesLeft, url, config, value) {
      if (retriesLeft > 0) {
        retriesLeft--
        const retryDelay = getRetryDelay(config, retriesLeft)

        if (config.onRetry && typeof config.onRetry === 'function') {
          config.onRetry({retriesLeft, retryDelay, response: value})
        }

        setTimeout(() => fetchAttempt(url, config, retriesLeft), retryDelay)
      } else {
        reject(value)
      }
    }

    function fetchAttempt (url, config, retriesLeft) {
      const {retryStatus, fetcher} = config
      fetcher(url, config)
        .then(res => {
          if (retryStatus.includes(res.status)) {
            retryAttempt(retriesLeft, url, config, res)
          } else {
            resolve(res)
          }
        })
        .catch(error => {
          if (config.retryOnFatalError) {
            retryAttempt(retriesLeft, url, config, error)
          } else {
            reject(error)
          }
        })
    }

    fetchAttempt(url, config, retries)
  })
}

function getRetryDelay ({retryDelay, factor, retries}, retriesLeft) {
  if (factor && typeof factor === 'number' && Number.isInteger(factor)) {
    return exponential(factor, retries - retriesLeft)
  }
  return linear(retryDelay, retries - retriesLeft)
}
