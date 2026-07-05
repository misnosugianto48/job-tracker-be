import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

import companyRoutes from "./routes/companyRoutes";
import applicationRoutes from "./routes/applicationRoutes";
import noteRoutes from "./routes/noteRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/companies", companyRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Job Tracker API is running!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
