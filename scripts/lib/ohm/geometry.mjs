// Ported from https://github.com/danvk/ohm (AdminAreas.tsx)

function decodePositions(pos) {
	let x = pos[0]
	let y = pos[1]
	const coords = new Array(pos.length / 2)
	coords[0] = [(x / 4_000_000) * 360 - 180, (y / 2_000_000) * 180 - 90]
	for (let i = 2; i < pos.length; i += 2) {
		x += pos[i]
		y += pos[i + 1]
		coords[i / 2] = [(x / 4_000_000) * 360 - 180, (y / 2_000_000) * 180 - 90]
	}
	return coords
}

function decodeRing(b64Ring, ways) {
	const binary = Buffer.from(b64Ring, 'base64')
	let pos = 0
	let prevAbs = 0
	let prevNeg = false
	const segments = []
	while (pos < binary.length) {
		let v = 0
		let shift = 0
		for (;;) {
			const b = binary[pos++]
			v |= (b & 0x7f) << shift
			shift += 7
			if (!(b & 0x80)) break
		}
		const signChanged = (v & 1) === 1
		const zz = v >>> 1
		const absDelta = (zz >>> 1) ^ -(zz & 1)
		const curAbs = prevAbs + absDelta
		const curNeg = signChanged ? !prevNeg : prevNeg
		const encoded = ways[String(curAbs)]
		if (!encoded) {
			throw new Error(`Missing way ${curAbs} for ring decode`)
		}
		const ringCoords = decodePositions(encoded)
		segments.push(curNeg ? ringCoords.reverse() : ringCoords)
		prevAbs = curAbs
		prevNeg = curNeg
	}
	return segments.flat()
}

export function relationToFeature(relation, ways, nodes) {
	const id = String(relation.id)
	const tags = relation.tags

	if ((!relation.ways || relation.ways.length === 0) && relation.nodes?.length) {
		const points = relation.nodes
			.map((nodeId) => nodes[String(nodeId)]?.loc)
			.filter(Boolean)
		if (points.length === 0) return null
		return {
			type: 'Feature',
			id,
			geometry: { type: 'MultiPoint', coordinates: points },
			properties: { ...tags, _relation_node: true }
		}
	}

	if (!relation.ways?.length) return null

	const polygons = relation.ways.map((polygon) =>
		polygon.map((ring) => decodeRing(ring, ways))
	)

	return {
		type: 'Feature',
		id,
		geometry: { type: 'MultiPolygon', coordinates: polygons },
		properties: tags
	}
}

export function featureCentroid(feature) {
	const geom = feature.geometry
	const points = []
	function walk(coords) {
		if (typeof coords[0] === 'number') {
			points.push(coords)
			return
		}
		for (const c of coords) walk(c)
	}
	walk(geom.coordinates)
	if (points.length === 0) return null
	const [lon, lat] = points.reduce(
		(acc, p) => [acc[0] + p[0], acc[1] + p[1]],
		[0, 0]
	)
	return [lon / points.length, lat / points.length]
}
