import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "spellcheck/spell-checker": [
        "warn",
        {
          comments: true,
          strings: true,
          identifiers: true,
          lang: "en_US",
          skipWords: [
            "dict",
            "compat",
            "lang",
            "aff",
            "hunspellchecker",
            "hunspell",
            "utils",
            "npm",
            "eslint",
            "printful",
            "webflow",
            "useState",
            "nextjs",
            "tsx",
            "jsx",
            "api",
            "params",
            "async",
            "auth",
            "middleware",
            "tailwind",
            "dropdown",
            "navbar",
            "sku",
            "enum",
            "skus",
            "backordered",
            "pathname",
            "signin",
            "checkbox",
            "semibold",
            "noreferrer",
            "noopener",
          ],
          skipIfMatch: ["http://[^s]*", "https://[^s]*"],
          minLength: 3,
        },
      ],
    },
  },
];

export default eslintConfig;
