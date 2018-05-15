import tenaciousFetch from '../src/index'

import fetch from 'node-fetch'

const baseURL = `http://localhost:${global.PORT}`

test('should export function', () => {
  expect(tenaciousFetch).toBeDefined()
})

test('should throw if no fetcher provided', () => {
//   expect(() => tenaciousFetch(`${baseURL}/name`)).toThrow()
})

test('should perform GET request', async () => {
  const res = await tenaciousFetch(`${baseURL}/name`, {
    fetcher: fetch
  })
  expect(res.status).toBe(200)
})

test('should perform POST request', async () => {
  const res = await tenaciousFetch(`${baseURL}/name`, {
    fetcher: fetch,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({success: true})
  })
  expect(res.status).toBe(200)
})

test('should timeout for long request', () => {
  expect(tenaciousFetch(`${baseURL}/timeout`, {
    fetcher: fetch,
    timeout: 500
  })).rejects.toThrowError()
})

test('should retry if request fails with 500', async () => {
  const res = await tenaciousFetch(`${baseURL}/retries`, {
    fetcher: fetch,
    retries: 3,
    retryDelay: 100,
    retryStatus: [500]
  })
  expect(res.status).toBe(200)
})

afterAll(() => {
  global.stop()
})
