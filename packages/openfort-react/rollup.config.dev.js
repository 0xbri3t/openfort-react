import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import typescript from 'rollup-plugin-typescript2'
import { createTransformer as createStyledComponentsTransformer } from 'typescript-plugin-styled-components'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

const styledComponentsTransformer = createStyledComponentsTransformer({
  displayName: true,
})

// Shared external dependencies
const sharedExternal = ['react', 'react-dom', 'framer-motion']

// Create typescript plugin with styled-components transformer
const createTypescriptPlugin = (declarationDir) =>
  typescript({
    useTsconfigDeclarationDir: true,
    exclude: 'node_modules/**',
    transformers: [
      () => ({
        before: [styledComponentsTransformer],
      }),
    ],
    ...(declarationDir && {
      tsconfigOverride: {
        compilerOptions: {
          declarationDir,
        },
      },
    }),
  })

const SRC_ROOT = resolve('src')

/**
 * Rollup plugin that rewrites relative imports escaping a sub-path directory
 * (e.g. src/wagmi/) to '@openfort/react', so the sub-path bundle shares
 * React contexts and Zustand stores with the main bundle at runtime.
 */
function rewriteToMainBundle(subdir) {
  const subpathRoot = resolve('src', subdir)
  return {
    name: `rewrite-to-main-bundle-${subdir}`,
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return null
      const resolved = resolve(dirname(importer), source)
      if (resolved.startsWith(SRC_ROOT) && !resolved.startsWith(subpathRoot)) {
        return { id: '@openfort/react', external: true }
      }
      return null
    },
  }
}

export default [
  // Main entry point (chain-agnostic)
  {
    input: './src/index.ts',
    external: sharedExternal,
    output: [
      {
        dir: './build',
        format: 'esm',
        sourcemap: false,
        entryFileNames: 'index.es.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    ],
    plugins: [peerDepsExternal(), createTypescriptPlugin()],
  },
  // Solana subpath export
  {
    input: './src/solana/index.ts',
    external: sharedExternal,
    output: [
      {
        file: packageJson.exports['./solana'].import,
        format: 'esm',
        sourcemap: false,
      },
    ],
    plugins: [rewriteToMainBundle('solana'), peerDepsExternal(), createTypescriptPlugin('build/solana')],
  },
  // Ethereum subpath export
  {
    input: './src/ethereum/index.ts',
    external: sharedExternal,
    output: [
      {
        file: packageJson.exports['./ethereum'].import,
        format: 'esm',
        sourcemap: false,
      },
    ],
    plugins: [rewriteToMainBundle('ethereum'), peerDepsExternal(), createTypescriptPlugin('build/ethereum')],
  },
  // Wagmi subpath export
  {
    input: './src/wagmi/index.ts',
    external: sharedExternal,
    output: [
      {
        file: packageJson.exports['./wagmi'].import,
        format: 'esm',
        sourcemap: false,
      },
    ],
    plugins: [rewriteToMainBundle('wagmi'), peerDepsExternal(), createTypescriptPlugin('build/wagmi')],
  },
]
