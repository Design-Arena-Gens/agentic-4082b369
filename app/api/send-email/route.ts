import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

type RequestPayload = {
  recipientEmail?: string;
  emailTopic?: string;
  additionalContext?: string;
};

type GeminiDraft = {
  subject: string;
  body: string;
};

const requiredEnvVars = [
  "GEMINI_API_KEY",
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_FROM",
] as const;

function validateEnvironment() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

function parsePayload(body: RequestPayload): asserts body is Required<Pick<RequestPayload, "recipientEmail" | "emailTopic">> &
  Pick<RequestPayload, "additionalContext"> {
  if (!body.recipientEmail || !body.emailTopic) {
    throw new Error("Both recipientEmail and emailTopic are required.");
  }
}

async function draftEmailWithGemini(
  topic: string,
  context?: string,
): Promise<GeminiDraft> {
  const apiKey = process.env.GEMINI_API_KEY as string;
  const modelName = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
  });

  const systemInstruction = `
You are a professional email assistant. Write clear, concise, friendly, and polished emails that match the instruction. Avoid placeholders and ensure the email is ready to send immediately. Produce JSON using the schema: {"subject": string, "body": string}. The body must use paragraph separation with blank lines and can include bullet lists when helpful. Keep the tone human and professional.
`;

  const prompt = `
Primary instruction:
${topic}

Additional context:
${context ?? "None provided"}

Return only valid JSON matching the schema. Do not include markdown fences or commentary.
`;

  const result = await model.generateContent([
    { text: systemInstruction },
    { text: prompt },
  ]);

  const responseText = result.response.text();

  const cleanResponse = responseText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanResponse) as GeminiDraft;
    if (!parsed.subject || !parsed.body) {
      throw new Error("Incomplete draft from Gemini.");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Gemini returned an invalid response. Raw output: ${responseText}`,
    );
  }
}

function bodyToHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => {
      const normalized = paragraph
        .split("\n")
        .map((line) => line.trimEnd())
        .join("<br/>");
      return `<p>${normalized}</p>`;
    })
    .join("\n");
}

async function sendEmail(recipientEmail: string, draft: GeminiDraft) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: recipientEmail,
    subject: draft.subject,
    text: draft.body,
    html: bodyToHtml(draft.body),
  });
}

export async function POST(request: Request) {
  try {
    validateEnvironment();

    const body = (await request.json()) as RequestPayload;
    parsePayload(body);

    const draft = await draftEmailWithGemini(
      body.emailTopic,
      body.additionalContext,
    );

    await sendEmail(body.recipientEmail, draft);

    return NextResponse.json({
      message: "Email generated and sent successfully.",
      debugLog: {
        recipientEmail: body.recipientEmail,
        subject: draft.subject,
        model: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
      },
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unable to process request.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
