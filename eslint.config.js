import { config as defaultConfig } from '@epic-web/config/eslint'
import { defineConfig } from 'eslint/config'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default defineConfig([...defaultConfig, jsxA11y.flatConfigs.recommended])
