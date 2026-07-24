#!/usr/bin/env node
/**
 * Free Nidus dev server ports before starting turbo dev.
 * Windows: uses netstat + taskkill. Unix: uses lsof + kill.
 */
import { execSync } from 'child_process'

const PORTS = [5173, 5174]

function freePortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && pid !== '0') pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        console.log(`Freed port ${port} (PID ${pid})`)
      } catch {
        // process may have already exited
      }
    }
  } catch {
    // findstr returns non-zero when no matches — port is free
  }
}

function freePortUnix(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' })
    for (const pid of out.trim().split('\n').filter(Boolean)) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
        console.log(`Freed port ${port} (PID ${pid})`)
      } catch {
        // ignore
      }
    }
  } catch {
    // port free
  }
}

const freePort = process.platform === 'win32' ? freePortWindows : freePortUnix

for (const port of PORTS) {
  freePort(port)
}
