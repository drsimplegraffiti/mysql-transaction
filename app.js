require("dotenv").config();

// Import required packages
const express = require("express");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/user.routes");
const errorhandler = require("errorhandler");
const cluster = require("express-cluster");
const config = require("./config/configService");
const logger = require("./logger/logger");
const { printIp } = require("./utils");

// Create Express app
const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const { method, url } = req;
  const { statusCode } = res;
  console.log(`METHOD: ${method} ENDPOINT: ${url} STATUS: ${statusCode} `);
  next();
});

// Homepage
app.get("/", (req, res) => {
  res.send("Welcome to the homepage");
});

// Routes
app.use(userRoutes);

// Error handling middleware
app.use(errorhandler());

// Cluster for production environment
if (config.env.isProduction) {
  cluster(
    (worker) => {
      app.listen(config.app.port, () => {
        console.log(`Server is running on port ${config.app.port}`);
      });
      printIp();
      logger.info(`Worker ${worker.id} started`);
    },
    {
      count: process.env.WEB_CONCURRENCY || 1,
      respawn: process.env.RESPAWN || false,
      timeout: process.env.TIMEOUT || 10000,
      verbose: process.env.VERBOSE || false,
      debug: process.env.DEBUG || false,
      env: process.env.NODE_ENV || "development",
    }
  );
} else {
  const port = config.app.port;
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
    printIp();
  });
}
