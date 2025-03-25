/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {},
  plugins: [daisyui],
  daisyui: {
    themes: ["silk", "dim"],
    darkTheme: "dim",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};
