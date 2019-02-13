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
    fetcher: window.fetch,  // Fetch implementation to use, default is window.fetch
    retries: 3,             // Number of retries, default is 1
    retryDelay: 1000 * 3,   // Delay in ms before retrying, default is 1000ms
    onRetry: ({retriesLeft, retryDelay, response}) => console.log(retriesLeft, retryDelay, response),
    retryStatus = [],       // Status codes of response that should trigger retry e.g. [500, 404] or just "500". 
                            // defaults to empty array
    timeout = 1000 * 15,    // Timeout in ms before throwing a timeout error for the request.
                            // Defaults to no timeout (undefined).
    factor: .5              // If factor is given, exponential backoff will be performed for retries, otherwise
                            // linear backoff is used  
}

const config = Object.assign({}, normalFetchConfig, additionalTenaciousFetchConfig)

tenaciousFetch(url, config).then(console.log).catch(console.error)
```

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am 'Add some feature'`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT
    
