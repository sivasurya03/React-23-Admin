export const describedBy = (id, error, hint) => [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
