/** @type {import('tailwindcss').Config} */
export default {
  content: ["../Index.html", "./src/**/*.{ts,js}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A1B33",
        navy: "#0D2C5A",
        mist: "#F6F8FC",
        brand: {
          50: "#F0F5FF",
          100: "#DBE7FF",
          200: "#BCD2FF",
          300: "#9AB9FF",
          400: "#5B90F7",
          500: "#2E6BEA",
          600: "#1F56D6",
          700: "#183FA8",
          800: "#142F7A",
          900: "#102557",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Instrument Sans", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.05),0 10px 28px -14px rgba(13,44,90,.16)",
        lift: "0 26px 50px -18px rgba(13,44,90,.28)",
      },
    },
  },
  plugins: [],
};
