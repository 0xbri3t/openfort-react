import { readFileSync } from 'node:fs'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import typescript from 'rollup-plugin-typescript2'
import { createTransformer as createStyledComponentsTransformer } from 'typescript-plugin-styled-components'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

const styledComponentsTransformer = createStyledComponentsTransformer({
  displayName: true,
})

// Shared external dependencies
const sharedExternal = ['react', 'react-dom', 'framer-motion', 'wagmi']

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

export default [
  // Main entry point (chain-agnostic)
  {
    input: './src/index.ts',
    external: sharedExternal,
    output: [
      {
        file: packageJson.exports['.'].import,
        format: 'esm',
        sourcemap: false,
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
    plugins: [peerDepsExternal(), createTypescriptPlugin('build/solana')],
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
    plugins: [peerDepsExternal(), createTypescriptPlugin('build/ethereum')],
  },
]
