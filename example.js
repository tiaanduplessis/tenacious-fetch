import tenaciousFetch from 'tenacious-fetch'

const url = 'https://jsonplaceholder.typicode.com/posts/1'
const normalFetchConfig = {
    method: 'GET',
    headers: {
      "Content-type": "Application/json charset=UTF-8"
    },
    // Others...
}


const additionalTenaciousFetchConfig = {
    fetcher: window.fetch,  // Fetch implementation to use, default is window.fetch
    retries: 3,             // Number of retries, default is 1
    retryDelay: 1000 * 3,   // Delay in ms before retrying, default is 1000ms
    retryStatus = [],       // Status codes of response that should trigger retry e.g. [500, 404] or just "500". 
                            // defaults to empty array
    timeout = 1000 * 15,    // Timeout in ms before throwing a timeout error for the request.
                            // Defaults to no timeout (undefined).
    factor: .5              // If factor is given, exponential backoff will be performed for retries, otherwise
                            // linear backoff is used  
}

const config = Object.assign({}, normalFetchConfig, additionalTenaciousFetchConfig)

tenaciousFetch(url, config).then(console.log).catch(console.error)