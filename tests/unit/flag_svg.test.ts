import { describe, expect, it } from 'vitest'
import { decodeSvgBuffer, isValidSvgText, normalizeSvgBuffer, sanitizeSvgText } from '../../scripts/lib/flags/svg.mjs'

describe('flag svg helpers', () => {
	it('sanitizes doctype and xml preamble', () => {
		const input = '<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"><svg></svg>'
		expect(sanitizeSvgText(input)).toBe('<svg></svg>')
	})

	it('decodes utf16 svg payloads', () => {
		const utf16 = Buffer.from([0xff, 0xfe, ...Buffer.from('<svg></svg>', 'utf16le')])
		expect(normalizeSvgBuffer(utf16)).toBe('<svg></svg>')
	})

	it('rejects truncated svg', () => {
		const { text } = decodeSvgBuffer(Buffer.from('<svg><path'))
		expect(isValidSvgText(text)).toBe(false)
	})
})
