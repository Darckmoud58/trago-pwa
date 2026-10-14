export function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'No encontrado' });
}

/** Manejador global: nunca expone stack al cliente. */
export function errorHandler(err, _req, res, _next) {
  const status = Number(err.status || err.statusCode) || 500;
  if (status >= 500) {
    console.error('[api-error]', err?.stack || err?.message || err);
    return res.status(500).json({ message: 'Error del servidor' });
  }
  console.warn('[api-client-error]', err?.message || err);
  return res.status(status).json({
    message: err.message || 'Error',
  });
}
