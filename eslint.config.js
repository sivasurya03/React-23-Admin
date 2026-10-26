import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules', 'screenshots'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Capitalised names are JSX components (this config has no jsx-uses-vars rule)
      'no-unused-vars': ['error', { varsIgnorePattern: '^([A-Z_]|motion$)', argsIgnorePattern: '^([A-Z_])' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Context modules intentionally export a Provider plus its hook.
    files: ['src/context/**/*.{js,jsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
]
