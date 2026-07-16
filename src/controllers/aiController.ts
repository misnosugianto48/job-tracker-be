import { ThinkingLevel } from "@google/genai";
import { Request, Response } from "express";
import { ZodError } from "zod";
import { getGeminiClient } from "../lib/gemini";
import logger from "../lib/logger";
import { parseJobSchema } from "../lib/schemas";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (issue.path.includes("description")) {
      return res.status(400).json({ error: "description is required and cannot be empty" });
    }
    return res.status(400).json({ error: issue.message });
  }

  // Handle Gemini API key configuration errors or execution failures
  if (error.message && error.message.includes("GEMINI_API_KEY")) {
    return res.status(400).json({ error: error.message });
  }

  logger.error("AI Controller Error:", error);
  return res.status(502).json({ error: `Gemini API failed: ${error.message || "Unknown error"}` });
};

/**
 * Endpoint to parse raw job descriptions into structured data
 * POST /api/ai/parse-job
 */
export const parseJobDescription = async (req: Request, res: Response) => {
  try {
    const { description } = parseJobSchema.parse(req.body);

    const ai = getGeminiClient();

    const schema = {
      type: "object",
      properties: {
        companyName: { type: "string" },
        jobTitle: { type: "string" },
        industry: { type: "string" },
        location: { type: "string" },
        expectedSalary: { type: "integer" },
        todos: {
          type: "array",
          items: { type: "string" },
          description: "A checklist of 3-5 specific preparation tasks or follow-up actions for this job (e.g. 'Review system design', 'Brush up on React state management', 'Follow up with recruiter')."
        }
      },
      required: ["companyName", "jobTitle", "todos"]
    };

    const prompt = `
      You are an expert recruiter assistant.
      Analyze the following raw job description text and extract structured key details.
      
      Instructions:
      - If the location, industry, or salary is not mentioned or cannot be inferred, return null or omit it.
      - For the expectedSalary, extract the numeric monthly or total salary value. If a range is given, return the higher end of the range. Convert to a single integer representing monthly or total salary. If it is in IDR (Rp), return the integer value directly (e.g. 20000000).
      - Ensure you extract a list of 3-5 specific, actionable preparation tasks or todo items (todos) for a candidate applying to this job.
      
      Job description:
      ${description}
    `;

    const models = [
      { name: "gemini-3.5-flash", useThinking: true },
      { name: "gemini-3.1-flash-lite", useThinking: true },
      { name: "gemini-3-flash-preview", useThinking: true },
      { name: "gemini-2.5-flash", useThinking: false },
      { name: "gemini-2.5-flash-native-audio-preview-12-2025", useThinking: false },
    ];

    let lastError: any = null;
    let response: any = null;

    for (const modelConfig of models) {
      try {
        logger.info(`Attempting job parsing with model: ${modelConfig.name}`);
        const config: any = {
          responseMimeType: "application/json",
          responseSchema: schema,
        };

        if (modelConfig.useThinking) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MEDIUM,
          };
        }

        response = await ai.models.generateContent({
          model: modelConfig.name,
          contents: prompt,
          config,
        });

        // Ensure we got a valid response text
        if (response && response.text) {
          logger.info(`Successfully parsed job description using model: ${modelConfig.name}`);
          break;
        } else {
          throw new Error(`Empty response text from model ${modelConfig.name}`);
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Model ${modelConfig.name} failed. Error: ${error.message || error}. Trying fallback model...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    const parsedData = JSON.parse(response.text);
    return res.status(200).json(parsedData);
  } catch (error) {
    return handleControllerError(error, res);
  }
};
