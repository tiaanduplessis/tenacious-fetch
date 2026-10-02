import { linear, exponential } from './backoff'

export default function retryingFetch (retries, url, config, cancelSignal) {
  const { signal } = config
  const signals = [signal, cancelSignal].filter((value, index, values) => value && values.indexOf(value) === index)
  let retryTimer
  let onAbort

  const request = new Promise((resolve, reject) => {
    let aborted = false

    onAbort = () => {
      aborted = true
      clearTimeout(retryTimer)
      const error = new Error('The operation was aborted.')
      error.name = 'AbortError'
      const abortedSignal = signals.find(signal => signal.aborted)
      reject(abortedSignal.reason === undefined ? error : abortedSignal.reason)
    }

    if (signals.some(signal => signal.aborted)) {
      onAbort()
      return
    }
    signals.forEach(signal => signal.addEventListener('abort', onAbort))

    function retryAttempt (retriesLeft, url, config, value) {
      if (aborted) return

      if (retriesLeft > 0) {
        retriesLeft--
        const retryDelay = getRetryDelay(config, retriesLeft)
        const retry = { retriesLeft, retryDelay, response: value }

        if (config.onRetry && typeof config.onRetry === 'function') {
          config.onRetry(retry)
        }

        retryTimer = setTimeout(() => {
          if (aborted) return

          if (typeof config.beforeRetry !== 'function') {
            fetchAttempt(url, config, retriesLeft)
            return
          }

          Promise.resolve()
            .then(() => {
              if (!aborted) return config.beforeRetry(retry)
            })
            .then(updates => {
              if (!aborted) {
                fetchAttempt(url, Object.assign({}, config, updates, { signal }), retriesLeft)
              }
            })
            .catch(reject)
        }, retryDelay)
      } else {
        reject(value)
      }
    }

    function fetchAttempt (url, config, retriesLeft) {
      const { retryStatus, fetcher } = config
      let response
      try {
        response = fetcher(url, config)
      } catch (error) {
        reject(error)
        return
      }

      Promise.resolve(response)
        .then(res => {
          if (aborted) return

          if (retryStatus.includes(res.status)) {
            retryAttempt(retriesLeft, url, config, res)
          } else {
            resolve(res)
          }
        }, error => {
          if (config.retryOnFatalError) {
            retryAttempt(retriesLeft, url, config, error)
          } else {
            reject(error)
          }
        })
        .catch(reject)
    }

    fetchAttempt(url, config, retries)
  })

  function cleanup () {
    clearTimeout(retryTimer)
    signals.forEach(signal => signal.removeEventListener('abort', onAbort))
  }

  return request.then(value => {
    cleanup()
    return value
  }, error => {
    cleanup()
    throw error
  })
}

function getRetryDelay ({ retryDelay, factor, retries }, retriesLeft) {
  if (factor && typeof factor === 'number' && Number.isInteger(factor)) {
    return exponential(factor, retries - retriesLeft)
  }
  return linear(retryDelay, retries - retriesLeft)
}
