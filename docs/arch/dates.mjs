const chicagoDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function daysUntil(date, now = new Date()) {
  const [year, month, day] = date.split('-').map(Number);
  const parts = Object.fromEntries(chicagoDate.formatToParts(now).map(({ type, value }) => [type, value]));
  const today = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  return Math.round((Date.UTC(year, month - 1, day) - today) / 86400000);
}

export function countdownText(days) {
  if (days < 0) return { value: 'Completed', label: '', accessible: 'Tournament completed' };
  if (days === 0) return { value: 'Today', label: '', accessible: 'Tournament is today' };
  return { value: String(days), label: days === 1 ? 'day to go' : 'days to go', accessible: `${days} ${days === 1 ? 'day' : 'days'} until the tournament` };
}
