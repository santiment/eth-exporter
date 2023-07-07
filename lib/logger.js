const Logger = require('node-json-logger');
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

const logger = new Logger({ level: LOG_LEVEL});

/* Syslog logging adapter

   This is used to be able to handle rdkafka logs properly
*/

const syslog_log_levels = {
    'debug': 7,
    'info': 6,
    'warn': 5,
    'error': 3,
    'fatal': 2,
    'none': 0
};

const SYSLOG_LOG_LEVEL = syslog_log_levels[LOG_LEVEL];

function log_according_to_syslog_level(level, ...args) {
  switch (level) {
  case 0:
      break;
  case 1:
  case 2:
      logger.fatal(...args);
      break;
  case 3:
      logger.error(...args);
      break;
  case 4:
  case 5:
      logger.warn(...args);
      break;
  case 6:
      logger.info(...args);
      break;
  case 7:
      logger.debug(...args);
      break;
  }
}

module.exports = {
    logger: logger,
    SYSLOG_LOG_LEVEL: SYSLOG_LOG_LEVEL,
    log_according_to_syslog_level: log_according_to_syslog_level
};
