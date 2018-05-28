export function linear (initialVal, attempt) {
  return initialVal * attempt
}

export function exponential (factor, attempt) {
  return Math.pow(factor, attempt)
}
