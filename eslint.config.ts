import eslint from '@eslint/js';
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
    ],
    ignores: ['src/clients/**'],
    rules: {
      '@typescript-eslint/array-type': 'error',
      'array-callback-return': 'error',
      'no-await-in-loop': 'error',
      'no-constructor-return': 'error',
      'no-inner-declarations': 'error',
      'no-promise-executor-return': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unassigned-vars': 'error',
      'no-unreachable-loop': 'error',
      'no-use-before-define': 'error',
      'no-useless-assignment': 'error',
      'require-atomic-updates': 'error',
      'arrow-body-style': 'error'
    }
  },
)
