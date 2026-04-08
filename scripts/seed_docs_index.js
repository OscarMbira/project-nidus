#!/usr/bin/env node

/**
 * Seed AI Documentation Index (Phase 1.5)
 * Reads all .md files from Documentation/, splits into ~500-word chunks,
 * extracts keywords (headers, bold terms), upserts into ai_docs_index.
 * Run with: npm run seed:ai-docs  (or node scripts/seed_docs_index.js)
 * Requires: SUPABASE_URL or VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load .env files from project root (Node does not load them by default)
const envFiles = ['.env', '.env.local', '.env.development'];
for (const name of envFiles) {
  try {
    const envPath = join(projectRoot, name);
    const envContent = await readFile(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  } catch {
    // each file optional
  }
}

const docsDir = join(projectRoot, 'Documentation');

const CHUNK_WORDS = 500;
const MAX_CHUNKS_PER_QUERY = 50;

function extractKeywords(text) {
  const keywords = new Set();
  const lower = text.toLowerCase();
  // Headings: # ## ### words
  const headingMatches = text.matchAll(/^#{1,6}\s*(.+)$/gm);
  for (const m of headingMatches) {
    m[1].split(/\s+/).forEach((w) => {
      const clean = w.replace(/[#*_`[\]]/g, '').toLowerCase();
      if (clean.length > 2) keywords.add(clean);
    });
  }
  // Bold: **word** or __word__
  const boldMatches = text.matchAll(/\*{1,2}([^*]+)\*{1,2}|_{1,2}([^_]+)_{1,2}/g);
  for (const m of boldMatches) {
    const phrase = (m[1] || m[2] || '').trim();
    phrase.split(/\s+/).forEach((w) => {
      const clean = w.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (clean.length > 2) keywords.add(clean);
    });
  }
  // Significant words from first 200 chars (title-like)
  const snippet = lower.slice(0, 300).replace(/[#*_`[\]]/g, ' ');
  snippet.split(/\s+/).forEach((w) => {
    if (w.length > 3 && !/^\d+$/.test(w)) keywords.add(w);
  });
  return Array.from(keywords).slice(0, 100);
}

function chunkText(text, maxWords = CHUNK_WORDS) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let current = [];
  let wordCount = 0;

  for (const p of paragraphs) {
    const words = p.split(/\s+/).length;
    if (wordCount + words > maxWords && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      wordCount = 0;
    }
    current.push(p);
    wordCount += words;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks;
}

function docTitleFromFilename(filename) {
  return filename
    .replace(/\.md$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getAllMdFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await getAllMdFiles(full, base)));
    } else if (e.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing env. Add to project root .env (do not commit the service key):');
    console.error('  SUPABASE_URL or VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co');
    console.error('  SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY=<your service_role key>');
    console.error('Get service_role from Supabase Dashboard → Project Settings → API.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const files = await getAllMdFiles(docsDir);
  console.log(`Found ${files.length} .md files in Documentation/`);

  let totalChunks = 0;
  for (const filePath of files) {
    const relativePath = filePath.replace(docsDir + (process.platform === 'win32' ? '\\' : '/'), '');
    const filename = relativePath.replace(/\\/g, '/');
    const docTitle = docTitleFromFilename(filename.split('/').pop());
    const docRoute = `/platform/documentation/platform/${encodeURIComponent(filename.replace(/\.md$/i, ''))}`;

    let content;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch (err) {
      console.warn(`Skip ${filename}: ${err.message}`);
      continue;
    }
    if (content.trim().startsWith('<')) continue;

    const chunks = chunkText(content);
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i].slice(0, 15000);
      const keywords = extractKeywords(chunkText);

      const row = {
        doc_filename: filename,
        doc_title: docTitle,
        chunk_index: i,
        chunk_text: chunkText,
        keywords,
        doc_route: docRoute,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('ai_docs_index').upsert(row, {
        onConflict: 'doc_filename,chunk_index',
        ignoreDuplicates: false,
      });
      if (error) {
        console.warn(`Upsert ${filename} chunk ${i}: ${error.message}`);
      } else {
        totalChunks++;
      }
    }
    if (chunks.length > 0) console.log(`  ${filename}: ${chunks.length} chunks`);
  }

  console.log(`\nDone. Total chunks upserted: ${totalChunks}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
