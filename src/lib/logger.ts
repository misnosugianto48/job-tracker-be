import winston from "winston";
import path from "path";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine current level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || "development";
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return env === "development" ? "debug" : "info";
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Development console format
const devConsoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}${info.stack ? `\n${info.stack}` : ""}`
  )
);

// Define formats
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const isDevelopment = (process.env.NODE_ENV || "development") === "development";

// Define transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isDevelopment ? devConsoleFormat : format,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/error.log"),
    level: "error",
    format,
  }),
  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/combined.log"),
    format,
  }),
];

export const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  transports,
});

export default logger;
