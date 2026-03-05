import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
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
      // If the resolved path is inside src/ but outside the sub-path directory,
      // redirect it to the main @openfort/react bundle.
      if (resolved.startsWith(SRC_ROOT) && !resolved.startsWith(subpathRoot)) {
        return { id: '@openfort/react', external: true }
      }
      return null
    },
  }
}

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
      rewriteToMainBundle('solana'),
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
      rewriteToMainBundle('ethereum'),
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
  // Wagmi subpath export
  {
    input: './src/wagmi/index.ts',
    external: sharedExternal,

    output: {
      file: packageJson.exports['./wagmi'].import,
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      rewriteToMainBundle('wagmi'),
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
