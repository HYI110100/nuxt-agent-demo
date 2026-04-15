import { ref, watch, Ref } from 'vue'

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: {
    serializer?: (value: T) => string
    deserializer?: (value: string) => T
  }
): Ref<T> {
  const { serializer = JSON.stringify, deserializer = JSON.parse } = options || {}

  const getStoredValue = (): T => {
    try {
      const storedValue = localStorage.getItem(key)
      if (storedValue === null) {
        return defaultValue
      }
      return deserializer(storedValue)
    } catch (error) {
      // console.error('Error reading from localStorage:', error)
      return defaultValue
    }
  }

  const value = ref<T>(getStoredValue())

  watch(value, (newValue) => {
    try {
      localStorage.setItem(key, serializer(newValue))
    } catch (error) {
      // console.error('Error writing to localStorage:', error)
    }
  }, { deep: true })

  return value
}