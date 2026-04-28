import type { AIProviderName, GenerateTextParams } from "./types";
import { generateWithGoogle } from "./providers/google";
import { hasGoogleApiKey } from "./providers/google";
import { generateWithOpenRouter, hasOpenRouterApiKey } from "./providers/openrouter";
import { generateWithOpencode, hasOpencodeApiKey } from "./providers/opencode";

function getConfiguredProvider(): AIProviderName {
  const configured = (process.env.AI_PROVIDER || "").toLowerCase();
  if (configured === "google") return "google";
  if (configured === "openrouter") return "openrouter";
  return "opencode";
}

function resolveProvider(model: string): AIProviderName {
  if (model.startsWith("gemini")) {
    return "google";
  }

  if (model.startsWith("minimax")) {
    return "opencode";
  }

  if (model.includes("/")) {
    return "openrouter";
  }

  return getConfiguredProvider();
}

export function getDefaultModel(): string {
  const configuredDefault = process.env.AI_DEFAULT_MODEL;
  if (configuredDefault) {
    return configuredDefault;
  }

  if (hasOpencodeApiKey()) {
    return "minimax-m2.5";
  }

  if (hasOpenRouterApiKey()) {
    return "openrouter/auto";
  }

  return "gemini-3.1-pro-preview";
}

function getFallbackModel(provider: AIProviderName): string {
  if (provider === "google") {
    return "gemini-3.1-pro-preview";
  }

  if (provider === "openrouter") {
    return "openrouter/auto";
  }

  return "minimax-m2.5";
}

function isProviderAvailable(provider: AIProviderName): boolean {
  if (provider === "google") {
    return hasGoogleApiKey();
  }

  if (provider === "openrouter") {
    return hasOpenRouterApiKey();
  }

  return hasOpencodeApiKey();
}

function getAlternateProviders(provider: AIProviderName): AIProviderName[] {
  if (provider === "google") {
    return ["opencode", "openrouter"];
  }

  if (provider === "opencode") {
    return ["google", "openrouter"];
  }

  return ["google", "opencode"];
}

function resolveRequest(params: GenerateTextParams): { provider: AIProviderName; model: string } {
  const requestedProvider = resolveProvider(params.model);

  if (isProviderAvailable(requestedProvider)) {
    return { provider: requestedProvider, model: params.model };
  }

  for (const alternateProvider of getAlternateProviders(requestedProvider)) {
    if (isProviderAvailable(alternateProvider)) {
      return { provider: alternateProvider, model: getFallbackModel(alternateProvider) };
    }
  }

  throw new Error(
    "No configured AI provider is available. Add OPENCODE_API_KEY, OPENROUTER_API_KEY, or GOOGLE_API_KEY/GEMINI_API_KEY."
  );
}

export function getAiConfig() {
  return {
    provider: getConfiguredProvider(),
    defaultModel: getDefaultModel(),
    availableProviders: {
      google: hasGoogleApiKey(),
      opencode: hasOpencodeApiKey(),
      openrouter: hasOpenRouterApiKey(),
    },
  };
}

export async function generateText(params: GenerateTextParams): Promise<string> {
  const resolved = resolveRequest(params);
  const request = { ...params, model: resolved.model };

  if (resolved.provider === "google") {
    return generateWithGoogle(request);
  }

  if (resolved.provider === "openrouter") {
    return generateWithOpenRouter(request);
  }

  return generateWithOpencode(request);
}
