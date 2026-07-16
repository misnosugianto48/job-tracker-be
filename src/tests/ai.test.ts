import request from "supertest";
import app from "../app";

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

describe("AI Job Description Parser Integration Tests", () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = "mock-api-key";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/ai/parse-job", () => {
    const rawJobText = `
      Software Engineer - Node.js & TypeScript
      Awesome Corp - Jakarta, Indonesia
      We are looking for a Software Engineer to join our growing team.
      Requirements:
      - 3+ years experience with Node.js and Express
      - Strong knowledge of PostgreSQL and Prisma ORM
      - Experience with React is a plus
      Salary range: IDR 15,000,000 - 20,000,000 per month.
    `;

    it("should successfully parse raw job description text into structured JSON", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          companyName: "Awesome Corp",
          jobTitle: "Software Engineer - Node.js & TypeScript",
          industry: "Technology",
          location: "Jakarta, Indonesia",
          expectedSalary: 20000000,
          todos: [
            "Prepare Node.js and Express project portfolio",
            "Review PostgreSQL indexing and optimization",
            "Review Prisma ORM relation modeling",
          ],
        }),
      });

      const response = await request(app)
        .post("/api/ai/parse-job")
        .send({ description: rawJobText });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("companyName", "Awesome Corp");
      expect(response.body).toHaveProperty("jobTitle", "Software Engineer - Node.js & TypeScript");
      expect(response.body).toHaveProperty("industry", "Technology");
      expect(response.body).toHaveProperty("location", "Jakarta, Indonesia");
      expect(response.body).toHaveProperty("expectedSalary", 20000000);
      expect(Array.isArray(response.body.todos)).toBe(true);
      expect(response.body.todos.length).toBeGreaterThan(0);

      // Verify that generateContent was called with the correct model and parameters
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe("gemini-3.5-flash");
      expect(callArgs.contents).toContain(rawJobText);
      expect(callArgs.config.responseMimeType).toBe("application/json");
      expect(callArgs.config.responseSchema).toBeDefined();
    });

    it("should return 400 Bad Request when description field is missing", async () => {
      const response = await request(app)
        .post("/api/ai/parse-job")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("description");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should return 400 Bad Request when description field is empty or whitespace", async () => {
      const response = await request(app)
        .post("/api/ai/parse-job")
        .send({ description: "   " });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("description");
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("should handle Gemini API errors gracefully and return 502 Bad Gateway", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Gemini API error"));

      const response = await request(app)
        .post("/api/ai/parse-job")
        .send({ description: rawJobText });

      expect(response.status).toBe(502);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Gemini API failed");
    });

    it("should fall back to the next model if the primary model fails", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Service Unavailable"))
        .mockResolvedValueOnce({
          text: JSON.stringify({
            companyName: "Fallback Corp",
            jobTitle: "Software Engineer",
            industry: "Technology",
            location: "Remote",
            expectedSalary: 15000000,
            todos: ["Prep 1", "Prep 2"],
          }),
        });

      const response = await request(app)
        .post("/api/ai/parse-job")
        .send({ description: rawJobText });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("companyName", "Fallback Corp");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(mockGenerateContent.mock.calls[0][0].model).toBe("gemini-3.5-flash");
      expect(mockGenerateContent.mock.calls[1][0].model).toBe("gemini-3.1-flash-lite");
    });
  });
});
