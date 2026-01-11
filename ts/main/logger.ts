import { AbstractLogger } from '../utils/logger.js';
import { configs } from './configs.js';

class Logger extends AbstractLogger {
    override get isDebug() {
        return configs.isDebug;
    }
}

export const logger = new Logger();