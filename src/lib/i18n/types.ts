import type { messages } from './constants.ts'

export type MessageKey = keyof (typeof messages)['en']
