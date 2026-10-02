import { Headers } from 'whatwg-fetch'
import tenaciousFetch from '../src/index'
import retryingFetch from '../src/retrying-fetch'

const url = 'https://example.invalid/resource'
const success = { status: 200 }
const unauthorized = { status: 401 }

function request (options = {}) {
  const config = Object.assign({
    retries: 1,
    retryDelay: 10,
    retryStatus: [401],
    retryOnFatalError: true,
    fetcher: jest.fn().mockResolvedValue(success)
  }, options)
  return retryingFetch(config.retries, url, config)
}

async function flush () {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

async function advance (milliseconds) {
  await flush()
  jest.advanceTimersByTime(milliseconds)
  await flush()
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

test('awaits refreshed headers after the delay and before the retry', async () => {
  const events = []
  const headers = Object.freeze({ Authorization: 'Bearer expired', Accept: 'application/json' })
  let finishRefresh
  const fetcher = jest.fn((_, config) => {
    events.push(config.headers.Authorization)
    return Promise.resolve(config.headers.Authorization === 'Bearer fresh' ? success : unauthorized)
  })
  const beforeRetry = jest.fn(() => {
    events.push('refresh')
    return new Promise(resolve => { finishRefresh = resolve })
  })
  const config = Object.freeze({
    fetcher,
    headers,
    beforeRetry,
    onRetry: () => events.push('onRetry')
  })
  const result = request(config)

  await advance(9)
  expect(events).toEqual(['Bearer expired', 'onRetry'])
  await advance(1)
  expect(events).toEqual(['Bearer expired', 'onRetry', 'refresh'])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(beforeRetry).toHaveBeenCalledWith({ retriesLeft: 0, retryDelay: 10, response: unauthorized })

  finishRefresh({ headers: Object.assign({}, headers, { Authorization: 'Bearer fresh' }) })
  await expect(result).resolves.toBe(success)
  expect(events).toEqual(['Bearer expired', 'onRetry', 'refresh', 'Bearer fresh'])
  expect(headers.Authorization).toBe('Bearer expired')
  expect(fetcher.mock.calls[0][1].headers).toBe(headers)
  expect(fetcher.mock.calls[1][1]).not.toBe(fetcher.mock.calls[0][1])
  expect(fetcher.mock.calls[1][1].headers.Accept).toBe('application/json')
})

test.each([
  ['object', { Authorization: 'Bearer expired' }],
  ['tuples', [['Authorization', 'Bearer expired']]],
  ['Headers', new Headers({ Authorization: 'Bearer expired' })]
])('replaces %s headers without changing the original value', async (_, headers) => {
  const snapshot = new Headers(headers).get('Authorization')
  const replacement = new Headers({ Authorization: 'Bearer fresh' })
  const fetcher = jest.fn().mockResolvedValueOnce(unauthorized).mockResolvedValue(success)
  const result = request({ fetcher, headers, beforeRetry: () => ({ headers: replacement }) })
  await advance(10)
  await expect(result).resolves.toBe(success)
  expect(new Headers(headers).get('Authorization')).toBe(snapshot)
  expect(fetcher.mock.calls[0][1].headers).toBe(headers)
  expect(fetcher.mock.calls[1][1].headers).toBe(replacement)
})

test('keeps retry counts, response identity, and linear backoff', async () => {
  const responses = [{ status: 401 }, { status: 401 }, { status: 401 }, success]
  const fetcher = jest.fn().mockImplementation(() => Promise.resolve(responses[fetcher.mock.calls.length - 1]))
  const beforeRetry = jest.fn(({ retriesLeft }) => ({ headers: { attempt: String(3 - retriesLeft) } }))
  const result = request({ retries: 3, fetcher, beforeRetry })
  await advance(10)
  await advance(20)
  await advance(30)
  await expect(result).resolves.toBe(success)
  expect(fetcher).toHaveBeenCalledTimes(4)
  expect(beforeRetry.mock.calls.map(([retry]) => retry.retriesLeft)).toEqual([2, 1, 0])
  expect(beforeRetry.mock.calls.map(([retry]) => retry.retryDelay)).toEqual([10, 20, 30])
  expect(beforeRetry.mock.calls.map(([retry]) => retry.response)).toEqual(responses.slice(0, 3))
  expect(fetcher.mock.calls.slice(1).map(([, config]) => config.headers.attempt)).toEqual(['1', '2', '3'])
})

test('preserves exponential backoff', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce(unauthorized).mockResolvedValueOnce(unauthorized).mockResolvedValue(success)
  const beforeRetry = jest.fn()
  const result = request({ retries: 2, factor: 3, fetcher, beforeRetry })
  await advance(3)
  await advance(9)
  await expect(result).resolves.toBe(success)
  expect(beforeRetry.mock.calls.map(([retry]) => retry.retryDelay)).toEqual([3, 9])
})

test('does not call hooks after a successful response or with no retries', async () => {
  const beforeRetry = jest.fn()
  await expect(request({ beforeRetry })).resolves.toBe(success)
  await expect(request({ retries: 0, beforeRetry, fetcher: () => Promise.resolve(unauthorized) })).rejects.toBe(unauthorized)
  expect(beforeRetry).not.toHaveBeenCalled()
})

test('rejects the final response when retries are exhausted', async () => {
  const beforeRetry = jest.fn()
  const fetcher = jest.fn().mockResolvedValue(unauthorized)
  const result = request({ beforeRetry, fetcher })
  const rejection = expect(result).rejects.toBe(unauthorized)
  await advance(10)
  await rejection
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(beforeRetry).toHaveBeenCalledTimes(1)
})

test.each(['throw', 'reject'])('propagates a hook %s without another fetch or retry', async kind => {
  const error = new Error('refresh failed')
  const beforeRetry = jest.fn(() => {
    if (kind === 'throw') throw error
    return Promise.reject(error)
  })
  const fetcher = jest.fn().mockResolvedValue(unauthorized)
  const result = request({ retries: 3, beforeRetry, fetcher })
  const rejection = expect(result).rejects.toBe(error)
  await advance(10)
  await rejection
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(beforeRetry).toHaveBeenCalledTimes(1)
})

test('undefined hook results preserve request options', async () => {
  const headers = { Accept: 'application/json' }
  const fetcher = jest.fn().mockResolvedValueOnce(unauthorized).mockResolvedValue(success)
  const result = request({ headers, method: 'POST', body: 'example', fetcher, beforeRetry: () => undefined })
  await advance(10)
  await expect(result).resolves.toBe(success)
  expect(fetcher.mock.calls[1][1]).toMatchObject({ headers, method: 'POST', body: 'example' })
})

test('default retries preserve the same config and onRetry metadata', async () => {
  const fetcher = jest.fn().mockResolvedValueOnce(unauthorized).mockResolvedValue(success)
  const onRetry = jest.fn()
  const result = request({ fetcher, onRetry })
  await advance(10)
  await expect(result).resolves.toBe(success)
  expect(fetcher.mock.calls[1][1]).toBe(fetcher.mock.calls[0][1])
  expect(onRetry).toHaveBeenCalledWith({ retriesLeft: 0, retryDelay: 10, response: unauthorized })
})

test('passes fatal fetch errors to the hook and respects retryOnFatalError', async () => {
  const error = new Error('connection failed')
  const beforeRetry = jest.fn()
  const fetcher = jest.fn().mockRejectedValueOnce(error).mockResolvedValue(success)
  const result = request({ fetcher, beforeRetry })
  await advance(10)
  await expect(result).resolves.toBe(success)
  expect(beforeRetry.mock.calls[0][0].response).toBe(error)
  beforeRetry.mockClear()
  await expect(request({ retryOnFatalError: false, beforeRetry, fetcher: () => Promise.reject(error) })).rejects.toBe(error)
  expect(beforeRetry).not.toHaveBeenCalled()
})

test('rejects onRetry errors rather than calling it recursively', async () => {
  const error = new Error('notification failed')
  const onRetry = jest.fn(() => { throw error })
  await expect(request({ onRetry, fetcher: () => Promise.resolve(unauthorized) })).rejects.toBe(error)
  expect(onRetry).toHaveBeenCalledTimes(1)
})

test('does not start an already-aborted request', async () => {
  const controller = new AbortController()
  controller.abort()
  const fetcher = jest.fn()
  await expect(request({ signal: controller.signal, fetcher })).rejects.toMatchObject({ name: 'AbortError' })
  expect(fetcher).not.toHaveBeenCalled()
})

test('aborts during backoff without running a hook or retry', async () => {
  const controller = new AbortController()
  const beforeRetry = jest.fn()
  const fetcher = jest.fn().mockResolvedValue(unauthorized)
  const result = request({ signal: controller.signal, beforeRetry, fetcher })
  const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' })
  await flush()
  controller.abort()
  await rejection
  await advance(100)
  expect(beforeRetry).not.toHaveBeenCalled()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('aborts a pending asynchronous hook and ignores its later result', async () => {
  const controller = new AbortController()
  let finishRefresh
  const beforeRetry = () => new Promise(resolve => { finishRefresh = resolve })
  const fetcher = jest.fn().mockResolvedValue(unauthorized)
  const result = request({ signal: controller.signal, beforeRetry, fetcher })
  const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' })
  await advance(10)
  controller.abort()
  await rejection
  finishRefresh({ headers: { Authorization: 'Bearer fresh' } })
  await flush()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('removes its abort listener after completion', async () => {
  const controller = new AbortController()
  const remove = jest.spyOn(controller.signal, 'removeEventListener')
  await request({ signal: controller.signal })
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
})

test('supports the hook through the public API and preserves default retry count', async () => {
  const beforeRetry = jest.fn(() => ({ headers: { Authorization: 'Bearer fresh' } }))
  const fetcher = jest.fn().mockResolvedValueOnce(unauthorized).mockResolvedValue(success)
  const config = Object.freeze({ fetcher, beforeRetry, retryStatus: '401', retryDelay: 10 })
  const result = tenaciousFetch(url, config)
  expect(fetcher).toHaveBeenCalledTimes(1)
  await advance(10)
  await expect(result).resolves.toBe(success)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(beforeRetry).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh')
  expect(config.retryStatus).toBe('401')
})

test.each([false, true])('times out during the hook with a caller signal: %s', async withSignal => {
  let finishRefresh
  const beforeRetry = () => new Promise(resolve => { finishRefresh = resolve })
  const fetcher = jest.fn().mockResolvedValue(unauthorized)
  const options = { fetcher, beforeRetry, retryStatus: [401], retryDelay: 10, timeout: 20 }
  if (withSignal) options.signal = new AbortController().signal
  const result = tenaciousFetch(url, options)
  const rejection = expect(result).rejects.toThrow('Request took longer than timeout of 20 ms.')
  await advance(10)
  await advance(10)
  await rejection
  finishRefresh({ headers: { Authorization: 'Bearer fresh' } })
  await flush()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('forwards caller cancellation when a timeout is configured and removes listeners', async () => {
  const controller = new AbortController()
  const remove = jest.spyOn(controller.signal, 'removeEventListener')
  const fetcher = jest.fn().mockResolvedValue(unauthorized)
  const result = tenaciousFetch(url, {
    fetcher,
    signal: controller.signal,
    beforeRetry: () => new Promise(() => {}),
    retryStatus: [401],
    retryDelay: 10,
    timeout: 100
  })
  const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' })
  await advance(10)
  controller.abort()
  await rejection
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
  expect(jest.getTimerCount()).toBe(0)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('preserves the original signal if a hook tries to replace it', async () => {
  const controller = new AbortController()
  const replacement = new AbortController()
  const fetcher = jest.fn().mockResolvedValueOnce(unauthorized).mockResolvedValue(success)
  const result = request({
    signal: controller.signal,
    fetcher,
    beforeRetry: () => ({ signal: replacement.signal })
  })
  await advance(10)
  await expect(result).resolves.toBe(success)
  expect(fetcher.mock.calls[1][1].signal).toBe(controller.signal)
})

test('rejects synchronous fetch errors and preserves immediate invocation', async () => {
  const error = new Error('fetch failed')
  const fetcher = jest.fn(() => { throw error })
  const result = request({ fetcher })
  expect(fetcher).toHaveBeenCalledTimes(1)
  await expect(result).rejects.toBe(error)
})

test('keeps caller cancellation attached to response bodies after a timed request succeeds', async () => {
  const controller = new AbortController()
  const fetcher = jest.fn().mockResolvedValue(success)
  await tenaciousFetch(url, { fetcher, signal: controller.signal, timeout: 100 })
  const fetchSignal = fetcher.mock.calls[0][1].signal
  expect(fetchSignal).toBe(controller.signal)
  expect(jest.getTimerCount()).toBe(0)
  controller.abort()
  expect(fetchSignal.aborted).toBe(true)
})
