<div align="center">
    <img width="20%" src="./logo.png" alt="" />
</div>

# tenacious-fetch
[![package version](https://img.shields.io/npm/v/tenacious-fetch.svg?style=flat-square)](https://npmjs.org/package/tenacious-fetch)
[![package downloads](https://img.shields.io/npm/dm/tenacious-fetch.svg?style=flat-square)](https://npmjs.org/package/tenacious-fetch)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/tenacious-fetch.svg?style=flat-square)](https://npmjs.org/package/tenacious-fetch)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Tiny fetch API wrapper to add support for retries with linear & exponential backoff and timeouts 

## Table of Contents

- [tenacious-fetch](#tenacious-fetch)
    - [Table of Contents](#table-of-contents)
    - [Install](#install)
    - [Usage](#usage)
    - [Contribute](#contribute)
    - [License](#license)

## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com). 

```sh
$ npm install tenacious-fetch
$ # OR
$ yarn add tenacious-fetch
```

## Usage

```js
import tenaciousFetch from 'tenacious-fetch'

const url = 'https://jsonplaceholder.typicode.com/posts/1'
const normalFetchConfig = {
    method: 'GET',
    headers: {
      "Content-Type": "application/json charset=UTF-8"
    },
    // Others...
}

const additionalTenaciousFetchConfig = {
    fetcher: window.fetch,      // Fetch implementation to use, default is window.fetch
    retries: 3,                 // Number of retries, default is 1
    retryDelay: 1000 * 3,       // Delay in ms before retrying, default is 1000ms
    onRetry: ({retriesLeft, retryDelay, response}) => console.log(retriesLeft, retryDelay, response),
    beforeRetry: undefined,    // Optional hook returning request options, or a promise for them
    retryStatus: [],           // Status codes of response that should trigger retry e.g. [500, 404] or just "500". 
                                // defaults to empty array
    retryOnFatalError: true,   // If there a fatal request (no response status), we can choose
                                // to retry or not
    timeout: 1000 * 15,        // Timeout in ms before throwing a timeout error for the request.
                                // Defaults to no timeout (undefined).
    factor: .5                  // If factor is given, exponential backoff will be performed for retries, otherwise
                                // linear backoff is used  
}

const config = Object.assign({}, normalFetchConfig, additionalTenaciousFetchConfig)

tenaciousFetch(url, config).then(console.log).catch(console.error)
```

### Refreshing headers before a retry

Use `beforeRetry` to refresh an expired token before sending another request:

```js
const headers = {
  Accept: 'application/json',
  Authorization: `Bearer ${currentToken}`
}

tenaciousFetch('/api/profile', {
  headers,
  retryStatus: [401],
  retries: 1,
  beforeRetry: async ({ response, retriesLeft, retryDelay }) => {
    if (response.status !== 401) return

    const token = await refreshAccessToken()
    return {
      headers: Object.assign({}, headers, { Authorization: `Bearer ${token}` })
    }
  }
})
```

The hook receives the same metadata as `onRetry`: the response or fetch error,
the remaining retry count, and the calculated delay. `onRetry` still runs when
the retry is scheduled. `beforeRetry` runs after that delay, immediately before
the next fetch, and its result is awaited. It does not run for the initial
request, successful responses, or after retries are exhausted.

Return request-option overrides (such as `{ headers }`), or return nothing to
keep the current options. Overrides are shallowly applied to a new configuration
and carried forward to later attempts. A returned `headers` value replaces all
headers; it is not merged automatically. Plain objects, header-entry arrays, and
`Headers` instances are supported, just as with fetch. The library does not
mutate the original configuration or headers. Use this hook for fetch options;
configure retry behavior on the original request.

A thrown error or rejected promise from the hook rejects the request without
another retry. The timeout and original abort signal also stop waiting for
retries; `beforeRetry` cannot replace the signal. Aborting or timing out during
the delay or an async hook prevents the next fetch. The hook's own asynchronous
work is not cancelled automatically, so pass the signal to any refresh operation
that supports it. A caller-provided signal remains attached to fetch, including
response-body reads. As before, a timeout does not abort a caller-owned signal;
abort that signal yourself if you also need to cancel its in-flight transport.

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am 'Add some feature'`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT
    
