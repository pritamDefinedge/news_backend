import dotenv from 'dotenv';
import cluster from 'cluster';
import os from 'os';
import connectDB from './db/index.js';
import { app } from './app.js';
import logger from './utils/logger.js';

// Load environment variables from .env file
dotenv.config({ path: './.env' });

// Get the number of available CPU cores
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    logger.info(`⚙️ Master process ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`⚙️ Worker ${worker.process.pid} exited. Forking a new worker...`);
        cluster.fork();
    });
} else {
    connectDB()
        .then(() => {
            app.listen(process.env.PORT || 8000, () => {
                logger.info(`⚙️ Worker ${process.pid} is running at port: ${process.env.PORT}`);
            });
        })
        .catch((err) => {
            logger.error('MONGO DB connection failed:', err);
            process.exit(1);
        });

    // Add error handling for uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception:', err);
        process.exit(1);
    });

    process.on('unhandledRejection', (err) => {
        logger.error('Unhandled Rejection:', err);
        process.exit(1);
    });
}
