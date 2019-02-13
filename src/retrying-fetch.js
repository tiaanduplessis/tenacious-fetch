import {linear, exponential} from './backoff'

export default function retryingFetch (retries, url, config) {
  return new Promise((resolve, reject) => {
    function fetchAttempt (url, config, retriesLeft) {
      let {retryStatus, fetcher} = config
      fetcher(url, config)
        .then(res => {
          if (retryStatus.includes(res.status)) {
            // TODO: - Remove repetition
            if (retriesLeft > 0) {
              retriesLeft--
              const retryDelay = getRetryDelay(config, retriesLeft)

              if (config.onRetry && typeof config.onRetry === 'function') {
                config.onRetry({retriesLeft, retryDelay, response: res})
              }

              setTimeout(() => fetchAttempt(url, config, retriesLeft), retryDelay)
            } else {
              reject(res)
            }
          } else {
            resolve(res)
          }
        })
        .catch(error => {
          if (retriesLeft > 0) {
            // TODO: - Remove repetition
            retriesLeft--
            const retryDelay = getRetryDelay(config, retriesLeft)

            if (config.onRetry && typeof config.onRetry === 'function') {
              config.onRetry({retriesLeft, retryDelay, error})
            }

            setTimeout(() => fetchAttempt(url, config, retriesLeft), retryDelay)
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
