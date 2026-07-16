import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

// Mock the GoogleGenAI SDK to avoid external API calls during testing
const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
    ThinkingLevel: {
      OFF: "OFF",
      MEDIUM: "MEDIUM",
      FULL: "FULL",
    },
  };
});

describe("AI Outreach Writer Integration Tests", () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = "mock-api-key";
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/ai/outreach", () => {
    const validParams = {
      type: "EMAIL",
      intent: "FOLLOW_UP",
      companyName: "Outreach Corp",
      jobTitle: "Software Engineer",
      recipientName: "Jane Doe",
      additionalContext: "Met at a tech meetup last week.",
    };

    it("should return 400 Bad Request when type is invalid", async () => {
      const response = await request(app)
        .post("/api/ai/outreach")
        .send({ ...validParams, type: "INVALID" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("type");
    });

    it("should successfully generate email outreach suggestions", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          subject: "Follow up - Software Engineer Application at Outreach Corp",
          content: "Dear Jane Doe, it was great meeting you at the tech meetup last week...",
        }),
      });

      const response = await request(app)
        .post("/api/ai/outreach")
        .send(validParams);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("subject");
      expect(response.body).toHaveProperty("content");
      expect(response.body.subject).toContain("Follow up");
      expect(response.body.content).toContain("Dear Jane Doe");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
