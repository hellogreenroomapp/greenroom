import { ref, watch } from 'vue'

export function useDebounce<T>(value: T, delay = 300) {
  const debouncedValue = ref(value) as { value: T }

  let timeoutId: ReturnType<typeof setTimeout>

  watch(
    () => value,
    (newValue) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        debouncedValue.value = newValue
      }, delay)
    },
    { immediate: true }
  )

  return debouncedValue
}
