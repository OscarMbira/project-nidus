/**
 * One-off codemod: resolve /platform/projects/:codeOrUuid for child pages.
 * Skips ProjectsDetail.jsx, ProjectsEdit.jsx, simulator, __tests__.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const pagesRoot = path.join(repoRoot, 'src', 'pages');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'simulator' || e.name === '__tests__') continue;
      walk(p, acc);
    } else if (e.name.endsWith('.jsx')) acc.push(p);
  }
  return acc;
}

function relImport(fromFile, toDirName) {
  const fromDir = path.dirname(fromFile);
  const target = path.join(repoRoot, 'src', toDirName);
  let r = path.relative(fromDir, target).replace(/\\/g, '/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r;
}

function insertAfterReactRouterDom(content) {
  const needle = "from 'react-router-dom'";
  const i = content.indexOf(needle);
  if (i === -1) return { ok: false, content };
  const lineEnd = content.indexOf('\n', i);
  return { ok: true, at: lineEnd + 1 };
}

function tplToPlatformPathCall(tplBody) {
  // tplBody like /platform/projects/${projectId}/cms/edit
  const m = tplBody.match(/^\/platform\/projects\/\$\{projectId\}(.*)$/);
  if (!m) return null;
  const tail = m[1] || '';
  const inner = tail.startsWith('/') ? tail.slice(1) : tail;
  const segs = inner.split('/').filter(Boolean);
  const args = ['routeKey', ...segs.map((s) => `'${s.replace(/'/g, "\\'")}'`)];
  return `platformProjectPath(${args.join(', ')})`;
}

function patchFile(file) {
  const base = path.basename(file);
  if (base === 'ProjectsDetail.jsx' || base === 'ProjectsEdit.jsx') return false;

  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes('useParams') || !s.includes('projectId')) return false;
  if (s.includes('usePlatformProjectId')) return false;

  let changed = false;
  let ns = s.replace(
    /const \{ projectId, ([^}]+) \} = useParams\(\)/g,
    (_, rest) => {
      changed = true;
      return `const { ${rest.trim()} } = useParams()\n  const { projectId, routeKey } = usePlatformProjectId()`;
    }
  );
  ns = ns.replace(/const \{ projectId \} = useParams\(\)/g, () => {
    changed = true;
    return 'const { projectId, routeKey } = usePlatformProjectId()';
  });

  if (!changed) return false;

  const ins = insertAfterReactRouterDom(ns);
  if (!ins.ok) return false;
  const hookImp = `\nimport { usePlatformProjectId } from '${relImport(file, 'hooks')}/usePlatformProjectId.js'`;
  ns = ns.slice(0, ins.at) + hookImp + ns.slice(ins.at);

  let needPathUtil = false;
  ns = ns.replace(/`(\/platform\/projects\/\$\{projectId\}[^`]*)`/g, (full, inner) => {
    const call = tplToPlatformPathCall(inner);
    if (!call) return full;
    needPathUtil = true;
    return call;
  });

  if (needPathUtil && !ns.includes('projectRouteParam')) {
    const ins2 = insertAfterReactRouterDom(ns);
    if (ins2.ok) {
      const u = `\nimport { platformProjectPath } from '${relImport(file, 'utils')}/projectRouteParam.js'`;
      ns = ns.slice(0, ins2.at) + u + ns.slice(ins2.at);
    }
  }

  fs.writeFileSync(file, ns);
  return true;
}

const files = walk(pagesRoot);
let n = 0;
for (const f of files) {
  if (patchFile(f)) {
    console.log('patched', path.relative(repoRoot, f));
    n += 1;
  }
}
console.log('done, files patched:', n);
