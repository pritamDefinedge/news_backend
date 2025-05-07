import logger from "./logger.js";

/**
 * Wraps an async function to handle errors in Express routes
 * @param {Function} fn - The async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            logger.error(`Async error in ${req.method} ${req.originalUrl}:`, error);
            next(error);
        });
    }
}

export { asyncHandler }