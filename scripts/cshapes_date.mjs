export function parseCShapesDate(value) {
	if (value == null || value === '') return null
	if (typeof value === 'number') return new Date(value, 0, 1)
	const text = String(value)
	const dotMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
	if (dotMatch) {
		const [, day, month, year] = dotMatch
		return new Date(Number(year), Number(month) - 1, Number(day))
	}
	const isoDate = new Date(text.slice(0, 10))
	return Number.isNaN(isoDate.getTime()) ? null : isoDate
}

export function isActiveOnDate(feature, date) {
	const props = feature.properties ?? {}
	const start =
		parseCShapesDate(props.gwsdate) ??
		parseCShapesDate(props.gwsyear) ??
		parseCShapesDate(props.startdate) ??
		parseCShapesDate(props.STRT_YR) ??
		parseCShapesDate(props.START_DAY)
	const end =
		parseCShapesDate(props.gwedate) ??
		parseCShapesDate(props.gweyear) ??
		parseCShapesDate(props.enddate) ??
		parseCShapesDate(props.END_YR) ??
		parseCShapesDate(props.END_DAY)
	if (start && date < start) return false
	if (end && date > end) return false
	return true
}

export function getGroupKey(props) {
	const gw = props.GWCODE ?? props.gwcode
	if (gw != null && gw !== '' && gw !== -99) return `gw:${gw}`
	const cow = props.COWCODE ?? props.cowcode
	if (cow != null && cow !== '' && cow !== -99) return `cow:${cow}`
	const name =
		props.cntry_name ??
		props.CNTRY_NAME ??
		props.countryname ??
		props.COUNTRYNAME ??
		props.NAME ??
		props.name ??
		'Unknown'
	return `name:${name}`
}
