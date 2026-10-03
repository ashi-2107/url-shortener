export class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

export function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export function notFoundHandler(req, res) {
    res.status(404).json({ error: `route ${req.originalUrl} not found` });
}

export function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode ?? 500;
    const message = err.statusCode ? err.message : 'internal server error';

    if (!err.statusCode) {
        console.error(err);
    }

    res.status(statusCode).json({ error: message });
}