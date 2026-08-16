import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.tsbuildinfo'],
  },

  // Backend: Node + TypeScript
  {
    files: ['backend/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Os controllers usam `req.user!` depois do middleware de autenticação.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // A tipagem de Request.user exige `declare global { namespace Express }`.
      '@typescript-eslint/no-namespace': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      eqeqeq: ['error', 'smart'],
    },
  },

  // Frontend: browser + React
  {
    files: ['frontend/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Regras novas do plugin que condenam o padrão de buscar dados no
      // useEffect com setLoading, usado em todas as páginas. Adotá-las exigiria
      // reescrever a camada de dados inteira, sem ganho funcional.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'smart'],
    },
  },

  // Testes: globais do Vitest
  {
    files: ['**/*.test.{ts,tsx}', 'backend/test/**/*.ts', 'frontend/src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.vitest },
    },
  },
);
