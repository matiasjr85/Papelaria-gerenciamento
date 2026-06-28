import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Padrões intencionais de carregamento/preview/mounted-guard usam setState
      // dentro de effects de forma controlada. Mantemos como aviso, não erro.
      "react-hooks/set-state-in-effect": "warn",
      // Variáveis/args não usados são aviso (ex.: `req` em handlers GET).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_|^req$" }],
      // `any` é aviso, não erro: usado apenas em respostas dinâmicas de API
      // (preview de venda/montagem). Tipagem estrita é melhoria rastreada na auditoria.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts de debug/verificação manual na raiz (não fazem parte do app):
    "debug*.mjs",
    "verify*.mjs",
    "teste_*.mjs",
  ]),
]);

export default eslintConfig;
