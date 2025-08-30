import eslint from '@eslint/js';
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
    ],
    ignores: ['src/clients/**'], // code-generated
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

      // suggestion enforcements to make TypeScript a sane language
      'arrow-body-style': 'error',
      'block-scoped-var': 'error',
      'camelcase': ['error', { properties: 'never' }], // code-generated client structures might not always adhere to camelcase
      'consistent-return': 'error',
      'default-case': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'eqeqeq': 'error',
      'func-name-matching': 'error',
      'func-style': ["error", "declaration"]
    }
  },
)
