export const linear = (initialVal, attempt) => {
  return initialVal * attempt
}

export const exponential = (factor, attempt) => {
  return Math.pow(factor, attempt)
}
