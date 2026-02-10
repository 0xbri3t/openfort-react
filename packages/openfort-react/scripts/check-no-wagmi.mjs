import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(process.cwd(), 'src')
const pkgPath = join(process.cwd(), 'package.json')

const wagmiImportRe = /from\s+['"]wagmi|from\s+['"]@wagmi/

function walk(dir, base = '') {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const rel = join(base, e.name)
    if (e.isDirectory()) {
      walk(join(dir, e.name), rel)
    } else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx') || e.name.endsWith('.js') || e.name.endsWith('.jsx')) {
      const content = readFileSync(join(dir, e.name), 'utf8')
      if (wagmiImportRe.test(content)) {
        process.exitCode = 1
      }
    }
  }
}

walk(srcDir)

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const deps = { ...pkg.dependencies, ...pkg.peerDependencies }
if (deps.wagmi != null || deps['@openfort/wagmi'] != null) {
  process.exitCode = 1
}

if (process.exitCode === 1) process.exit(1)
