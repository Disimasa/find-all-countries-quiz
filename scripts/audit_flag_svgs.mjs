import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const eraId = process.argv.find((a) => a.startsWith('--era='))?.split('=')[1] ?? 'ce1300'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'static/flags/eras', eraId)
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))

function readSvg(buf) {
	if (buf[0] === 0xff && buf[1] === 0xfe) return { encoding: 'utf16le', text: buf.toString('utf16le') }
	return { encoding: 'utf8', text: buf.toString('utf8') }
}

for (const { entityId, file } of manifest) {
	if (!file.endsWith('.svg')) continue
	const buf = fs.readFileSync(path.join(dir, file))
	const { encoding, text } = readSvg(buf)
	const issues = []
	if (encoding !== 'utf8') issues.push('utf16')
	if (!/<svg[\s>]/i.test(text)) issues.push('not-svg')
	if (!text.includes('</svg>')) issues.push('truncated')
	if (/class="fil\d/.test(text) && !/\.fil0\b/.test(text)) issues.push('missing-css')
	if (/<!DOCTYPE[^>]+PUBLIC/.test(text)) issues.push('doctype')
	if (issues.length) console.log(`${entityId}\t${issues.join(',')}\t${buf.length}`)
}
