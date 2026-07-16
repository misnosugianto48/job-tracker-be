import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Returns an instance of the GoogleGenAI client configured with the GEMINI_API_KEY environment variable.
 * Throws an error if the environment variable is missing.
 */
export const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your backend .env file.");
  }
  return new GoogleGenAI({ apiKey });
};
