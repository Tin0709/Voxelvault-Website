/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  darkMode: "class",

  theme: {
    extend: {
      colors: {
        "on-error-container": "#ffdad6",
        "on-tertiary-fixed-variant": "#00513a",
        "tertiary-fixed": "#a6f2cf",
        "on-secondary-fixed": "#002113",

        "primary-fixed-dim": "#68dba9",
        "inverse-on-surface": "#313032",

        "surface-container-lowest": "#0e0e10",
        "on-tertiary": "#003827",

        "secondary-fixed-dim": "#4edea3",
        "surface-container-high": "#2a2a2c",
        "surface-container-low": "#1c1b1d",

        "on-secondary-container": "#00311f",
        "primary-container": "#25a475",

        "on-secondary-fixed-variant": "#005236",

        "primary-fixed": "#85f8c4",

        "on-background": "#e5e1e4",
        outline: "#87948b",

        "surface-tint": "#68dba9",

        secondary: "#4edea3",

        "secondary-fixed": "#6ffbbe",

        "surface-variant": "#353437",

        "on-surface": "#e5e1e4",

        "surface-container": "#201f22",

        surface: "#131315",

        "outline-variant": "#3d4a42",

        "on-secondary": "#003824",

        tertiary: "#8bd6b4",

        "surface-bright": "#39393b",

        error: "#ffb4ab",

        "tertiary-fixed-dim": "#8bd6b4",

        "on-tertiary-container": "#003121",

        "on-surface-variant": "#bccac0",

        "surface-dim": "#131315",

        "on-primary-container": "#00311f",

        "on-primary-fixed": "#002114",

        "on-error": "#690005",

        "on-primary": "#003825",

        primary: "#68dba9",

        "inverse-primary": "#006c4a",

        "on-tertiary-fixed": "#002115",

        "surface-container-highest": "#353437",

        "inverse-surface": "#e5e1e4",

        "error-container": "#93000a",

        background: "#131315",

        "on-primary-fixed-variant": "#005137",

        "secondary-container": "#00a572",

        "tertiary-container": "#559f80",
      },

      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },

      spacing: {
        "space-xs": "0.375rem",
        "space-sm": "0.75rem",
        "space-md": "1.25rem",
        "space-lg": "2rem",
        "space-xl": "3.5rem",

        "gutter-sm": "1rem",
        gutter: "1.5rem",

        margin: "2.5rem",
        "margin-mobile": "1.25rem",
      },

      fontFamily: {
        "body-md": ["Hanken Grotesk", "sans-serif"],
        "body-lg": ["Hanken Grotesk", "sans-serif"],
        "body-sm": ["Hanken Grotesk", "sans-serif"],

        "headline-lg": ["Outfit", "sans-serif"],
        "headline-md": ["Outfit", "sans-serif"],
        "headline-sm": ["Outfit", "sans-serif"],

        "display-lg": ["Outfit", "sans-serif"],

        "label-sm": ["Hanken Grotesk", "sans-serif"],
        "label-md": ["Hanken Grotesk", "sans-serif"],
      },

      fontSize: {
        "body-md": [
          "15px",
          {
            lineHeight: "24px",
            fontWeight: "400",
          },
        ],

        "body-lg": [
          "17px",
          {
            lineHeight: "26px",
            letterSpacing: "-0.005em",
            fontWeight: "400",
          },
        ],

        "body-sm": [
          "13px",
          {
            lineHeight: "18px",
            letterSpacing: "0.005em",
            fontWeight: "400",
          },
        ],

        "headline-lg": [
          "32px",
          {
            lineHeight: "40px",
            letterSpacing: "-0.02em",
            fontWeight: "500",
          },
        ],

        "headline-md": [
          "24px",
          {
            lineHeight: "32px",
            letterSpacing: "-0.015em",
            fontWeight: "500",
          },
        ],

        "headline-sm": [
          "20px",
          {
            lineHeight: "28px",
            letterSpacing: "-0.01em",
            fontWeight: "500",
          },
        ],

        "label-sm": [
          "11px",
          {
            lineHeight: "14px",
            letterSpacing: "0.04em",
            fontWeight: "500",
          },
        ],

        "label-md": [
          "12px",
          {
            lineHeight: "16px",
            letterSpacing: "0.06em",
            fontWeight: "600",
          },
        ],
      },
    },
  },

  plugins: [],
};
