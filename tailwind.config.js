/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./services/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
    "./data/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8ef",
          100: "#ffefd9",
          200: "#ffd7a8",
          300: "#ffbc72",
          400: "#ff9a3c",
          500: "#ff7c1f",
          600: "#ed6211",
          700: "#c44a10",
          800: "#9c3d14",
          900: "#7d3414"
        },
        ocean: {
          50: "#eefdf8",
          100: "#d4f8ef",
          200: "#aaefdd",
          300: "#73e1c7",
          400: "#39c8a8",
          500: "#17ad8f",
          600: "#0f8b74",
          700: "#0f6f5f",
          800: "#11594d",
          900: "#12493f"
        }
      },
      boxShadow: {
        panel: "0 24px 70px -28px rgba(15, 23, 42, 0.18)",
        glow: "0 16px 40px -18px rgba(255, 124, 31, 0.38)"
      },
      backgroundImage: {
        "dashboard-grid":
          "linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px)"
      },
      fontFamily: {
        sans: ["var(--font-app)", "sans-serif"]
      }
    }
  },
  plugins: []
};
