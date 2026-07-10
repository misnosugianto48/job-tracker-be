import { Request, Response } from "express";
import prisma from "../lib/prisma";

const escapeCsvValue = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  let strVal = String(val);
  if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n") || strVal.includes("\r")) {
    strVal = `"${strVal.replace(/"/g, '""')}"`;
  }
  return strVal;
};

export const exportData = async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string || "json").toLowerCase();

    if (format === "csv") {
      const applications = await prisma.application.findMany({
        include: {
          company: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const headers = [
        "ID",
        "Company Name",
        "Job Title",
        "Date Applied",
        "Source",
        "Posting URL",
        "Expected Salary",
        "Stage",
        "Resume Version",
        "Created At",
        "Updated At",
      ];

      const rows = applications.map((app) => [
        app.id,
        app.company.name,
        app.jobTitle,
        app.dateApplied ? app.dateApplied.toISOString() : "",
        app.source || "",
        app.postingUrl || "",
        app.expectedSalary !== null ? app.expectedSalary : "",
        app.stage,
        app.resumeVersion || "",
        app.createdAt.toISOString(),
        app.updatedAt.toISOString(),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map(escapeCsvValue).join(",")),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=job_tracker_backup.csv");
      return res.status(200).send(csvContent);
    } else {
      // Default: JSON export of all database data
      const [companies, applications] = await Promise.all([
        prisma.company.findMany({
          orderBy: {
            name: "asc",
          },
        }),
        prisma.application.findMany({
          include: {
            notes: {
              orderBy: {
                createdAt: "desc",
              },
            },
            todos: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=job_tracker_backup.json");
      return res.status(200).json({ companies, applications });
    }
  } catch (error) {
    console.error("Export error:", error);
    return res.status(500).json({ error: "Failed to export data." });
  }
};
