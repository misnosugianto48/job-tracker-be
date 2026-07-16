import { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../lib/prisma";
import { getGeminiClient } from "../lib/gemini";
import logger from "../lib/logger";
import { practiceChatSchema } from "../lib/schemas";
import { ThinkingLevel } from "@google/genai";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    if (issue.path.includes("message")) {
      return res.status(400).json({ error: "message is required and cannot be empty" });
    }
    return res.status(400).json({ error: issue.message });
  }
  logger.error("Practice Controller Error:", error);
  return res.status(500).json({ error: error.message || "Internal server error" });
};

/**
 * GET /api/applications/:id/practice
 * Fetch all messages in the practice session for a job application
 */
export const getPracticeSession = async (req: Request, res: Response) => {
  try {
    const appId = parseInt(req.params.id as string, 10);
    if (isNaN(appId)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const session = await prisma.practiceSession.findFirst({
      where: { applicationId: appId },
    });

    if (!session) {
      return res.status(200).json({ messages: [] });
    }

    return res.status(200).json({ messages: session.messages });
  } catch (error) {
    return handleControllerError(error, res);
  }
};

/**
 * POST /api/applications/:id/practice/chat
 * Send a message to the AI interviewer and get the interviewer response
 */
export const practiceChat = async (req: Request, res: Response) => {
  try {
    const appId = parseInt(req.params.id as string, 10);
    if (isNaN(appId)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }

    const { message } = practiceChatSchema.parse(req.body);

    const application = await prisma.application.findUnique({
      where: { id: appId },
      include: { company: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Load or create practice session
    let session = await prisma.practiceSession.findFirst({
      where: { applicationId: appId },
    });

    let previousMessages: any[] = [];
    if (session) {
      previousMessages = session.messages as any[];
    }

    // Format prompt with history
    let historyText = "";
    for (const msg of previousMessages) {
      const speaker = msg.role === "user" ? "Candidate" : "Interviewer";
      historyText += `${speaker}: ${msg.content}\n\n`;
    }
    historyText += `Candidate: ${message}\n\nInterviewer:`;

    const systemPrompt = `
You are conducting a professional mock practice interview.
Role details:
Job Title: ${application.jobTitle}
Company: ${application.company.name}

Guidelines:
1. You are the Interviewer. Ask one relevant interview question at a time.
2. Provide constructive feedback or follow-up naturally on the candidate's answers.
3. Introduce yourself briefly if this is the start of the chat.
4. Keep replies to 1-2 paragraphs max so it reads like a real-time messaging UI. Do not add conversational prefixes like "Interviewer:".
`;

    const prompt = `${systemPrompt}\n\nHere is the interview history so far:\n${historyText}`;

    const ai = getGeminiClient();
    const models = [
      { name: "gemini-3.5-flash", useThinking: true },
      { name: "gemini-2.5-flash", useThinking: true },
      { name: "gemini-2.5-pro", useThinking: true },
      { name: "gemini-1.5-flash", useThinking: false },
      { name: "gemini-1.5-pro", useThinking: false },
    ];

    let lastError: any = null;
    let responseText = "";

    for (const modelConfig of models) {
      try {
        logger.info(`Attempting mock interview with model: ${modelConfig.name}`);
        const config: any = {};

        if (modelConfig.useThinking) {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.MEDIUM,
          };
        }

        const response = await ai.models.generateContent({
          model: modelConfig.name,
          contents: prompt,
          config,
        });

        if (response && response.text) {
          responseText = response.text.trim();
          logger.info(`Successfully generated interview response using model: ${modelConfig.name}`);
          break;
        } else {
          throw new Error(`Empty response text from model ${modelConfig.name}`);
        }
      } catch (error: any) {
        lastError = error;
        logger.warn(`Model ${modelConfig.name} failed. Error: ${error.message || error}. Trying fallback model...`);
      }
    }

    if (!responseText) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    // Clean up any potential double prefix in the AI response
    if (responseText.startsWith("Interviewer:")) {
      responseText = responseText.replace(/^Interviewer:\s*/i, "");
    }

    // Save message history to DB
    const newMessages = [
      ...previousMessages,
      { role: "user", content: message, createdAt: new Date().toISOString() },
      { role: "model", content: responseText, createdAt: new Date().toISOString() },
    ];

    if (session) {
      await prisma.practiceSession.update({
        where: { id: session.id },
        data: { messages: newMessages },
      });
    } else {
      await prisma.practiceSession.create({
        data: {
          applicationId: appId,
          messages: newMessages,
        },
      });
    }

    return res.status(200).json({ role: "model", content: responseText });
  } catch (error) {
    return handleControllerError(error, res);
  }
};
