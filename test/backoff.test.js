import {linear, exponential} from '../src/backoff'

test('should increase linearly', () => {
  expect(linear(100, 1)).toBe(100)
  expect(linear(100, 2)).toBe(200)
  expect(linear(100, 3)).toBe(300)
})

test('should increment exponentially', () => {
  expect(exponential(10, 1)).toBe(10)
  expect(exponential(10, 2)).toBe(100)
})

afterAll(() => {
  global.stop()
})
