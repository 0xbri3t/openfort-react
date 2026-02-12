import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Compatibilidad con ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Project root
export const ROOT_OUT = path.resolve(__dirname, '../../../..')

// Playwright output directories
export const TEST_RESULTS_DIR = path.join(ROOT_OUT, 'test-results')
const AUTH_STATE_DIR = path.join(TEST_RESULTS_DIR, '.auth')
/** Mode-specific auth state paths (for parallel mode testing) */
export const AUTH_STATE_EVM_ONLY = path.join(AUTH_STATE_DIR, 'state-evm-only.json')
export const AUTH_STATE_SOLANA = path.join(AUTH_STATE_DIR, 'state-solana.json')
