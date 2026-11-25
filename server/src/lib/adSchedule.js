/** Las fechas sin hora del panel corresponden al calendario de Guadalajara. */
export function parseAdDate(value, end = false) {
  if (value == null || value === '') return null;
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly
    ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}-06:00`
    : value);
  const localDay = dateOnly && Number.isFinite(date.getTime())
    ? new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null;
  if (!Number.isFinite(date.getTime()) || (dateOnly && value !== localDay)) {
    throw Object.assign(new Error('Selecciona una fecha válida para la campaña.'), { status: 400 });
  }
  return date;
}

export function assertAdSchedule(start, end, { publish = false, now = new Date() } = {}) {
  if (start && end && start > end) {
    throw Object.assign(new Error('La fecha de fin debe ser igual o posterior a la de inicio.'), { status: 400 });
  }
  if (publish && end && end < now) {
    throw Object.assign(new Error('La fecha de fin ya pasó. Elige una fecha vigente antes de publicar.'), { status: 400 });
  }
}
