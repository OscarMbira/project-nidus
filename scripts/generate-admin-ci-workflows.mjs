#!/usr/bin/env node
/** Generate CI workflow files for all admin modules */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('E:/Hifo/AI Business/project-nidus-admin')
const MODULES = [
  'subscriptions', 'system', 'support', 'errors', 'mirrors', 'platform',
  'simulator', 'security', 'content', 'feedback', 'audit', 'admin-mgmt',
]

const template = (name, pkg) => `name: Admin ${name} Module CI/CD
on:
  push:
    branches: [main, develop]
    paths:
      - 'modules/${name}/**'
  pull_request:
    paths:
      - 'modules/${name}/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=${pkg}
`

for (const name of MODULES) {
  const pkg = `@nidus-admin/${name}`
  const file = path.join(ROOT, '.github/workflows', `admin-${name}.yml`)
  fs.writeFileSync(file, template(name, pkg))
  console.log('Wrote', file)
}
