/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ダウナー・ゴスロリテーマ
        'dawn': '#2C2417',      // 濃い焦茶
        'dusk': '#8B7B74',      // 薄い焦茶
        'gothic': '#1A0F0A',    // 黒茶
        'lace': '#F5E6D3',      // 淡いベージュ
        'ribbon': '#D4A5A5',    // くすんだピンク
        'velvet': '#3D2D2A',    // 濃い栗色
      },
      fontFamily: {
        'serif': ['Georgia', 'serif'],
        'gothic': ['ゴシック', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
