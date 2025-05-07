import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get("User-Agent") || "Unknown";
    const ip = req.ip || req.connection.remoteAddress;

    logger.info({
        timestamp,
        method,
        url,
        userAgent,
        ip,
        requestId: req.id,
        body: req.body,
        query: req.query,
        params: req.params
    });

    // Add response logging
    const oldSend = res.send;
    res.send = function (data) {
        res.send = oldSend;
        res.responseData = data;
        return res.send(data);
    };

    res.on('finish', () => {
        logger.info({
            timestamp: new Date().toISOString(),
            method,
            url,
            statusCode: res.statusCode,
            responseTime: Date.now() - req.startTime,
            requestId: req.id
        });
    });

    next();
};

export const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get("User-Agent") || "Unknown";
    const ip = req.ip || req.connection.remoteAddress;

    logger.error({
        timestamp,
        method,
        url,
        userAgent,
        ip,
        error: {
            message: err.message,
            stack: err.stack,
            status: err.status || 500
        },
        requestId: req.id,
        body: req.body,
        query: req.query,
        params: req.params
    });

    res.status(err.status || 500).json({
        timestamp,
        method,
        url,
        message: err.message || "Internal Server Error",
        status: err.status || 500,
        requestId: req.id
    });
}; 