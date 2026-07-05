import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { Stage } from "@prisma/client";

// Get dashboard metrics and widgets
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // 1. Activity Summary & Conversion Rate
    const stageCounts = await prisma.application.groupBy({
      by: ["stage"],
      _count: {
        _all: true,
      },
    });

    // Initialize counts
    const counts: Record<Stage, number> = {
      WISHLIST: 0,
      APPLIED: 0,
      ASSESSMENT: 0,
      INTERVIEW: 0,
      OFFERED: 0,
      REJECTED: 0,
    };

    stageCounts.forEach((group) => {
      counts[group.stage] = group._count._all;
    });

    const activeCount =
      counts.WISHLIST + counts.APPLIED + counts.ASSESSMENT + counts.INTERVIEW + counts.OFFERED;
    const rejectedCount = counts.REJECTED;
    const offeredCount = counts.OFFERED;
    const totalCount = activeCount + rejectedCount;

    // Conversion rate: Offered / (Offered + Rejected)
    const outcomesTotal = offeredCount + rejectedCount;
    const conversionRate = outcomesTotal > 0 ? (offeredCount / outcomesTotal) * 100 : 0;

    // 2. Upcoming Events (Interviews or Assessments due within the next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // To make sure we include events for the entire 7th day, we can set it to the end of that day.
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingEvents = await prisma.note.findMany({
      where: {
        type: { in: ["INTERVIEW", "ASSESSMENT"] },
        eventDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        application: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        eventDate: "asc",
      },
    });

    // 3. Stagnant Applications (No changes or new notes in the last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const stagnantApplications = await prisma.application.findMany({
      where: {
        stage: { in: ["WISHLIST", "APPLIED", "ASSESSMENT", "INTERVIEW"] },
        updatedAt: {
          lte: fourteenDaysAgo,
        },
      },
      include: {
        company: true,
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

    return res.status(200).json({
      summary: {
        counts,
        active: activeCount,
        rejected: rejectedCount,
        offered: offeredCount,
        total: totalCount,
        conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal place
      },
      upcomingEvents,
      stagnantApplications,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard metrics." });
  }
};
