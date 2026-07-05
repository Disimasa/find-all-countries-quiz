import { describe, expect, it } from 'vitest'

import type { GeoEntity } from '@domain/entities'

import { sortEntitiesAlphabetically } from '../../src/routes/play/country_list.ts'

function entity(id: string, nameEn: string, nameRu: string): GeoEntity {
	return {
		id,
		names: { en: nameEn, ru: nameRu }
	}
}

describe('sortEntitiesAlphabetically', () => {
	it('sorts by locale name', () => {
		const entities = [
			entity('b', 'Brazil', 'Бразилия'),
			entity('a', 'Argentina', 'Аргентина'),
			entity('c', 'Chile', 'Чили')
		]

		expect(sortEntitiesAlphabetically(entities, 'en').map((item) => item.id)).toEqual([
			'a',
			'b',
			'c'
		])
		expect(sortEntitiesAlphabetically(entities, 'ru').map((item) => item.id)).toEqual([
			'a',
			'b',
			'c'
		])
	})

	it('does not mutate the input array', () => {
		const entities = [entity('b', 'Brazil', 'Бразилия'), entity('a', 'Argentina', 'Аргентина')]
		const copy = [...entities]

		sortEntitiesAlphabetically(entities, 'en')

		expect(entities).toEqual(copy)
	})
})
