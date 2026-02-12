import { readFileSync } from 'node:fs'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import typescript from 'rollup-plugin-typescript2'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Shared rollup plugins
const sharedPlugins = [
  peerDepsExternal(),
  typescript({
    useTsconfigDeclarationDir: true,
    exclude: 'node_modules/**',
  }),
]

// Shared external dependencies
const sharedExternal = ['react', 'react-dom', 'framer-motion']

export default [
  // Main entry point (chain-agnostic)
  {
    input: './src/index.ts',
    external: sharedExternal,
    output: {
      file: packageJson.exports['.'].import,
      format: 'esm',
      sourcemap: true,
    },
    plugins: sharedPlugins,
  },
  // Solana subpath export
  {
    input: './src/solana/index.ts',
    external: sharedExternal,
    output: {
      file: packageJson.exports['./solana'].import,
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      peerDepsExternal(),
      typescript({
        useTsconfigDeclarationDir: true,
        exclude: 'node_modules/**',
        tsconfigOverride: {
          compilerOptions: {
            declarationDir: 'build/solana',
          },
        },
      }),
    ],
  },
  // Ethereum subpath export
  {
    input: './src/ethereum/index.ts',
    external: sharedExternal,
    output: {
      file: packageJson.exports['./ethereum'].import,
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      peerDepsExternal(),
      typescript({
        useTsconfigDeclarationDir: true,
        exclude: 'node_modules/**',
        tsconfigOverride: {
          compilerOptions: {
            declarationDir: 'build/ethereum',
          },
        },
      }),
    ],
  },
]
