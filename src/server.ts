import app from "./app";
import logger from "./lib/logger";

const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: any) => {
  logger.error("Unhandled Rejection:", err);
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: any) => {
  logger.error("Uncaught Exception:", err);
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});
