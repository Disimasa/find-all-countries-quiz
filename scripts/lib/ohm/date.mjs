// Ported from https://github.com/danvk/ohm (OpenHistoricalMap date parsing)

function toDecimal(d) {
	const padded = padDate(d, 'start')
	return padded ? isoDateToDecimalDate(padded, false) : null
}

export function toDecimalEarliest(d) {
	return toDecimal(d)
}

export function toDecimalLatest(d) {
	const padded = padDate(d, 'end')
	return padded ? isoDateToDecimalDate(padded, false) : null
}

function formatIsoYear(year) {
	if (year < 0) return '-' + String(-year).padStart(4, '0')
	return String(year).padStart(4, '0')
}

function nextDayIso(isoFull) {
	const parts = splitDateString(isoFull)
	if (!parts) throw new Error(`Cannot parse date: ${isoFull}`)
	let [year, month, day] = parts
	day++
	if (day > howManyDaysInMonth(year, month)) {
		day = 1
		month++
		if (month > 12) {
			month = 1
			year++
		}
	}
	return `${formatIsoYear(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function toDecimalExclusiveEnd(d) {
	const paddedEnd = padDate(d, 'end')
	if (!paddedEnd || !splitDateString(paddedEnd)) return null
	return isoDateToDecimalDate(nextDayIso(paddedEnd), false)
}

export function isLeapYear(year) {
	let y = year
	if (y <= 0) y += 1
	return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
}

export function howManyDaysInYear(year) {
	return isLeapYear(year) ? 366 : 365
}

export function howManyDaysInMonth(year, month) {
	if ([1, 3, 5, 7, 8, 10, 12].includes(month)) return 31
	if ([4, 6, 9, 11].includes(month)) return 30
	if (month === 2) return isLeapYear(year) ? 29 : 28
	return 0
}

function isValidMonth(month) {
	return month >= 1 && month <= 12
}

function isValidMonthDay(year, month, day) {
	return isValidMonth(month) && day > 0 && day <= howManyDaysInMonth(year, month)
}

function yday(year, month, day) {
	if (!isValidMonthDay(year, month, day)) {
		throw new Error(`Not a valid date ${year}, ${month}, ${day}`)
	}
	let dayspassed = 0
	for (let m = 1; m < month; m++) dayspassed += howManyDaysInMonth(year, m)
	return dayspassed + day
}

export function splitDateString(datestring) {
	const match = datestring.match(/^(-?\+?\d+)-(\d\d)-(\d\d)$/)
	if (!match) return null
	return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
}

export function isoDateToDecimalDate(datestring, tryToFixInvalid) {
	const parts = splitDateString(datestring)
	if (!parts) {
		if (tryToFixInvalid == null) throw new Error(`Cannot parse date: ${datestring}`)
		return null
	}

	let [yearint, monthint, dayint] = parts

	if (!isValidMonthDay(yearint, monthint, dayint)) {
		if (tryToFixInvalid == null) {
			throw new Error(`Not a valid date ${yearint}, ${monthint}, ${dayint}`)
		} else if (!tryToFixInvalid) {
			return null
		} else {
			if (!isValidMonth(monthint)) return yearint
			dayint = 1
		}
	}

	if (yearint <= 0) yearint -= 1

	const daynumber = yday(yearint, monthint, dayint) - 0.5
	const daysinyear = howManyDaysInYear(yearint)
	const decibit = daynumber / daysinyear

	let decimaldate
	if (yearint < 0) {
		decimaldate = 1 + 1 + yearint - (1 - decibit)
	} else {
		decimaldate = yearint + decibit
	}

	return Math.round(decimaldate * 100000) / 100000
}

export function padDate(datestring, startend = 'start') {
	if (datestring == null) return null
	datestring = datestring.replace(/^\+/, '')
	if (!datestring) return datestring
	if (/^-?\d+-\d\d-\d\d$/.test(datestring)) return datestring
	if (/^-?\d+$/.test(datestring)) {
		return startend === 'start' ? `${datestring}-01-01` : `${datestring}-12-31`
	}
	if (/^-?\d+-\d\d$/.test(datestring)) {
		if (startend === 'start') return `${datestring}-01`
		const yearstring = datestring.slice(0, datestring.length - 3)
		const monthstring = datestring.slice(datestring.length - 2)
		const lastday = String(
			howManyDaysInMonth(parseInt(yearstring, 10), parseInt(monthstring, 10))
		).padStart(2, '0')
		return `${datestring}-${lastday}`
	}
	return ''
}

export function yearToDecimal(year) {
	return isoDateToDecimalDate(`${year}-07-01`, false)
}
