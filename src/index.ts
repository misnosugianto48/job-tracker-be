import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import companyRoutes from "./routes/companyRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/companies", companyRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Job Tracker API is running!" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
