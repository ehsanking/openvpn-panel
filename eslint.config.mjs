import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "next-env.d.ts"]
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@next/next': nextPlugin,
      'react': reactPlugin,
      'react-hooks': hooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "off",
      "@next/next/no-html-link-for-pages": "off"
    }
  }
);


