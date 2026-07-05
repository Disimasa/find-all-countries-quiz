import type { Feature, MultiPolygon, Polygon } from 'geojson'

export type EditableFeature = Feature<Polygon | MultiPolygon>

const DEFAULT_MAX_SIZE = 50

export function cloneEditableFeature(feature: EditableFeature): EditableFeature {
	return JSON.parse(JSON.stringify(feature))
}

export function geometryEquals(a: EditableFeature, b: EditableFeature): boolean {
	return JSON.stringify(a.geometry) === JSON.stringify(b.geometry)
}

export class GeometryHistory {
	private stack: EditableFeature[] = []
	private readonly maxSize: number

	constructor(maxSize = DEFAULT_MAX_SIZE) {
		this.maxSize = maxSize
	}

	clear(): void {
		this.stack = []
	}

	get size(): number {
		return this.stack.length
	}

	push(feature: EditableFeature | null): void {
		if (!feature) return

		const snapshot = cloneEditableFeature(feature)
		const top = this.stack[this.stack.length - 1]
		if (top && geometryEquals(top, snapshot)) return

		this.stack.push(snapshot)
		if (this.stack.length > this.maxSize) {
			this.stack.shift()
		}
	}

	pop(): EditableFeature | null {
		const snapshot = this.stack.pop()
		return snapshot ? cloneEditableFeature(snapshot) : null
	}
}
