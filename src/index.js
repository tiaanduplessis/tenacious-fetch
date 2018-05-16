const ONE_SECOND = 1000
let browserFetch = false

try {
  browserFetch = window && window.fetch
} catch (error) {}

function tenaciousFetch (url = '', config = {}) {
  config = Object.assign({
    retries: 1,
    retryDelay: ONE_SECOND,
    retryStatus: [],
    fetcher: browserFetch,
    timeout: undefined
  }, config)

  let {retries, retryDelay, retryStatus, fetcher, timeout} = config

  if (!fetcher || typeof fetcher !== 'function') {
    throw new Error(
      'tenacious-fetch: No fetch implementation found. Provide a valid fetch implementation via the fetcher configuration property.'
    )
  }

  if (typeof retryStatus === 'string' || typeof retryStatus === 'number') {
    retryStatus = [Number.parseInt(retryStatus)]
  }

  function retryingFetch (retries, url, config) {
    let retriesLeft = retries

    return new Promise((resolve, reject) => {
      function fetchAttempt () {
        fetcher(url, config)
          .then(res => {
            if (retryStatus.includes(res.status)) {
              if (retriesLeft > 0) {
                retry()
              } else {
                reject(res)
              }
            } else {
              resolve(res)
            }
          })
          .catch(error => {
            if (retriesLeft > 0) {
              retry()
            } else {
              reject(error)
            }
          })
      }

      function retry () {
        retriesLeft--
        setTimeout(fetchAttempt, retryDelay)
      }

      fetchAttempt(retries)
    })
  }

  if (timeout && Number.isInteger(timeout)) {
    return Promise.race([
      retryingFetch(retries, url, config),
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

  return retryingFetch(retries, url, config)
}

export default tenaciousFetch
