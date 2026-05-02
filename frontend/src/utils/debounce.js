/**
 * Debounce function - delays execution until after wait ms of inactivity
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds (default 300ms)
 * @returns {Function} Debounced function with .cancel() method
 */
export function debounce(fn, delay = 300) {
  let timer = null
  const debounced = function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}

/**
 * Prevents duplicate submissions by wrapping an async function
 * Returns a function that sets loading ref to true during execution
 * @param {Function} fn - The async function to protect
 * @param {import('vue').Ref} loadingRef - A ref to track loading state
 * @returns {Function} Protected function
 */
export function withLoading(fn, loadingRef) {
  return async function (...args) {
    if (loadingRef.value) return
    loadingRef.value = true
    try {
      return await fn.apply(this, args)
    } finally {
      loadingRef.value = false
    }
  }
}
