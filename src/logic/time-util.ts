export function dateTimeToString(date: Date): string {
	return `${date.toDateString()} ${date.toLocaleTimeString()}`;
}
