import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ProjectAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  relativePath: string;
  extractionStatus: "ready" | "unsupported" | "error";
  extractedText: string;
  summary: string;
}

function getPythonExecutable(): string {
  const candidates = [
    process.env.BBP_PYTHON_PATH,
    "/Users/HAND/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3",
    "python3",
  ].filter(Boolean) as string[];

  return candidates[0];
}

export async function extractAttachmentContent(filePath: string): Promise<Pick<ProjectAttachment, "extractionStatus" | "extractedText" | "summary">> {
  const scriptPath = path.join(process.cwd(), "scripts", "extract_attachment.py");
  const python = getPythonExecutable();

  if (!fs.existsSync(scriptPath)) {
    return {
      extractionStatus: "error",
      extractedText: "",
      summary: "Attachment extractor script is missing.",
    };
  }

  try {
    const { stdout } = await execFileAsync(python, [scriptPath, filePath], {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10,
    });
    const parsed = JSON.parse(stdout);
    const extractedText = typeof parsed.extractedText === "string" ? parsed.extractedText.trim() : "";
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

    return {
      extractionStatus: extractedText || summary ? "ready" : "unsupported",
      extractedText,
      summary: summary || "Document uploaded successfully.",
    };
  } catch (error: any) {
    console.error("Attachment extraction error:", error);
    return {
      extractionStatus: "error",
      extractedText: "",
      summary: "We stored the file, but extraction failed for this document.",
    };
  }
}
