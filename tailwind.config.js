/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./app.vue",
    "./plugins/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1677ff',
        secondary: '#52c41a',
        danger: '#ff4d4f',
        warning: '#faad14',
        info: '#1890ff',
      },
    },
  },
  plugins: [],
}