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
  // Main entry point (chain-agnostic); uses output.dir to support dynamic-import chunks (Solana context/strategy)
  {
    input: './src/index.ts',
    external: sharedExternal,
    output: {
      dir: 'build',
      format: 'esm',
      sourcemap: true,
      entryFileNames: 'index.es.js',
      chunkFileNames: 'chunks/[name]-[hash].js',
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
  {
    input: './src/wagmi/index.ts',
    external: [...sharedExternal, '@openfort/react'],
    output: {
      file: packageJson.exports['./wagmi'].import,
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
            declarationDir: 'build/wagmi',
          },
        },
      }),
    ],
  },
]
