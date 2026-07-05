export function decodeSvgBuffer(buffer) {
	if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
		return { encoding: 'utf16le', text: buffer.toString('utf16le') }
	}
	if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
		return { encoding: 'utf16be', text: buffer.toString('utf16be') }
	}
	return { encoding: 'utf8', text: buffer.toString('utf8') }
}

export function isValidSvgText(text) {
	return /<svg[\s>]/i.test(text) && /<\/svg>\s*$/i.test(text.trim())
}

export function sanitizeSvgText(text) {
	let out = text.replace(/^\uFEFF/, '')
	out = out.replace(/<\?xml[^?]*\?>\s*/i, '')
	out = out.replace(/<!DOCTYPE[^>]*(\[[\s\S]*?\])?\s*>\s*/i, '')
	return out.trim()
}

export function normalizeSvgBuffer(buffer) {
	const { text } = decodeSvgBuffer(buffer)
	const sanitized = sanitizeSvgText(text)
	if (!isValidSvgText(sanitized)) {
		throw new Error('invalid svg payload')
	}
	return sanitized
}
