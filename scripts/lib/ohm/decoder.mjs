// Ported from https://github.com/danvk/ohm

import { toDecimalEarliest, toDecimalExclusiveEnd, toDecimalLatest } from './date.mjs'

function decodeTags(flat, tagPairs, tagKeys, tagVals) {
	const tags = {}
	let i = 0
	while (i < flat.length) {
		const x = flat[i++]
		if (typeof x === 'number' && x < 0) {
			const [k, v] = tagPairs[-(x + 1)]
			tags[k] = v
		} else {
			const k = tagKeys[x]
			const raw = flat[i++]
			tags[k] = typeof raw === 'string' ? raw : tagVals[raw]
		}
	}
	return tags
}

export function decodeRelation(r, relFile) {
	return {
		...r,
		id: String(r.id),
		tags: decodeTags(r.tags, relFile.tagPairs, relFile.tagKeys, relFile.tagVals)
	}
}

export function computeEffectiveDates(relations) {
	const byId = new Map(relations.map((r) => [String(r.id), r]))

	for (const r of relations) {
		const sd = r.tags.start_date
		const ed = r.tags.end_date
		r.startDecDate = sd ? (toDecimalEarliest(sd) ?? undefined) : undefined
		r.endDecDate = ed ? (toDecimalExclusiveEnd(ed) ?? undefined) : undefined
	}

	for (const r of relations) {
		const endDate = r.tags.end_date
		if (!endDate) continue
		for (const chrono of r.chronology ?? []) {
			if (chrono.next === undefined) continue
			const next = byId.get(String(chrono.next))
			if (!next || next.tags.start_date !== endDate) continue
			const earliest = toDecimalEarliest(endDate)
			const latest = toDecimalLatest(endDate)
			if (earliest === null || latest === null) continue
			const midpoint = (earliest + latest) / 2
			r.endDecDate = midpoint
			next.startDecDate = midpoint
		}
	}
}

export function isRelationActiveAt(relation, yearDec) {
	if (yearDec === null) return true
	if (relation.startDecDate !== undefined && yearDec < relation.startDecDate) return false
	if (relation.endDecDate !== undefined && yearDec >= relation.endDecDate) return false
	return true
}
