import {linear, exponential} from './backoff'

export default function retryingFetch (retries, url, config) {
  return new Promise((resolve, reject) => {
    function fetchAttempt (url, config, retriesLeft) {
      let {retryStatus, fetcher} = config
      fetcher(url, config)
        .then(res => {
          if (retryStatus.includes(res.status)) {
            if (retriesLeft > 0) {
              retriesLeft--
              setTimeout(() => fetchAttempt(url, config, retriesLeft), getRetryDelay(config, retriesLeft))
            } else {
              reject(res)
            }
          } else {
            resolve(res)
          }
        })
        .catch(error => {
          if (retriesLeft > 0) {
            retriesLeft--
            setTimeout(() => fetchAttempt(url, config, retriesLeft), getRetryDelay(config, retriesLeft))
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
