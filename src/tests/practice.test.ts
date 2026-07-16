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

describe("AI Mock Interview Coach Integration Tests", () => {
  let companyId: number;
  let applicationId: number;

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = "mock-api-key";

    // Clean DB
    await prisma.practiceSession.deleteMany();
    await prisma.application.deleteMany();
    await prisma.company.deleteMany();

    // Create a mock company & application
    const company = await prisma.company.create({
      data: {
        name: "Coach Corp",
        industry: "Education",
        location: "San Francisco, CA",
      },
    });
    companyId = company.id;

    const application = await prisma.application.create({
      data: {
        companyId: company.id,
        jobTitle: "Staff React Engineer",
        stage: "INTERVIEW",
      },
    });
    applicationId = application.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/applications/:id/practice", () => {
    it("should return an empty messages list when no practice session exists yet", async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}/practice`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ messages: [] });
    });
  });

  describe("POST /api/applications/:id/practice/chat", () => {
    it("should return 400 Bad Request when message is missing or empty", async () => {
      const response = await request(app)
        .post(`/api/applications/${applicationId}/practice/chat`)
        .send({ message: "   " });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("message");
    });

    it("should start a chat session and return model response, saving it to database", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: "Hi there! I am your interviewer for the Staff React Engineer role. Tell me about your experience.",
      });

      const response = await request(app)
        .post(`/api/applications/${applicationId}/practice/chat`)
        .send({ message: "Let's start the interview." });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("role", "model");
      expect(response.body).toHaveProperty("content");
      expect(response.body.content).toContain("Staff React Engineer");

      // Verify it was saved to DB
      const session = await prisma.practiceSession.findFirst({
        where: { applicationId },
      });
      expect(session).toBeDefined();
      const messages = session?.messages as any[];
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Let's start the interview.");
      expect(messages[1].role).toBe("model");
      expect(messages[1].content).toContain("Staff React Engineer");
    });
  });
});
