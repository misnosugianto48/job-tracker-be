import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

import companyRoutes from "./routes/companyRoutes";
import applicationRoutes from "./routes/applicationRoutes";
import noteRoutes from "./routes/noteRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import todoRoutes from "./routes/todoRoutes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/companies", companyRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", todoRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Job Tracker API is running!" });
});

export default app;
