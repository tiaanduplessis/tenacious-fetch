require("abortcontroller-polyfill/dist/abortcontroller-polyfill-only");var t,e=require("whatwg-fetch");function r(t,e,r){return new Promise(function(n,o){function i(t,e,r,n){if(t>0){t--;var i=function(t,e){var r=t.retryDelay,n=t.factor,o=t.retries;return n&&"number"==typeof n&&Number.isInteger(n)?function(t,e){return Math.pow(t,e)}(n,o-e):r*(o-e)}(r,t);r.onRetry&&"function"==typeof r.onRetry&&r.onRetry({retriesLeft:t,retryDelay:i,response:n}),setTimeout(function(){return u(e,r,t)},i)}else o(n)}function u(t,e,r){var u=e.retryStatus;(0,e.fetcher)(t,e).then(function(o){u.includes(o.status)?i(r,t,e,o):n(o)}).catch(function(n){e.retryOnFatalError?i(r,t,e,n):o(n)})}u(e,r,t)})}t=window&&window.fetch&&"signal"in new window.Request("")?window.fetch:e.fetch,module.exports=function(e,n){void 0===e&&(e=""),void 0===n&&(n={});var o=new AbortController;if(!(n=Object.assign({retries:1,retryDelay:1e3,retryStatus:[],retryOnFatalError:!0,fetcher:t,signal:o.signal,timeout:void 0},n)).fetcher||"function"!=typeof n.fetcher)throw new Error("tenacious-fetch: No fetch implementation found. Provide a valid fetch implementation via the fetcher configuration property.");"string"!=typeof n.retryStatus&&"number"!=typeof n.retryStatus||(n.retryStatus=[Number.parseInt(n.retryStatus)]);var i=n.timeout;return i&&Number.isInteger(i)?Promise.race([r(n.retries,e,n),new Promise(function(t,e){return setTimeout(function(){o.abort(),e(new Error("tenacious-fetch: Request took longer than timeout of "+i+" ms."))},i)})]):r(n.retries,e,n)};
//# sourceMappingURL=tenacious-fetch.js.map
