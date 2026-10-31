/** Centralized error handler: keeps error responses consistent. */
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  if (err.code === 'P2002') return res.status(409).json({ error: `A record with this ${err.meta?.target || 'value'} already exists.` });
  if (err.code === 'P2025') return res.status(404).json({ error: 'The requested record was not found.' });
  if (err.code === 'P2003') return res.status(400).json({ error: 'This action references a record that does not exist, or the record is still in use.' });
  if (err.name === 'MulterError') return res.status(400).json({ error: `Upload error: ${err.message}` });
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on the server.' });
}

/** Wraps an async handler so thrown errors reach errorHandler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
