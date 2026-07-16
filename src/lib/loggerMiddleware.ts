import { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import logger from "./logger";

// Stream for morgan to route logs through Winston
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

// Skip request logging in test environment to avoid cluttering test outputs
const skip = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "test";
};

// Morgan middleware to log incoming HTTP requests
export const requestLogger = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream, skip }
);

// Global Express error handler to catch and log unhandled exceptions
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the detailed error using winston
  logger.error(`Unhandled request error: ${err.message || err}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    // Avoid logging sensitive information in body if any, but general request details are useful
    query: req.query,
    params: req.params,
  });

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: statusCode === 500 ? "An unexpected error occurred on the server." : (err.message || "Request failed"),
  });
};
