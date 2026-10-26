import Anthropic from "@anthropic-ai/sdk";

// The one place that decides which Claude model the product uses.
// Set ANTHROPIC_MODEL in the environment to switch models without a deploy of code.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

// Tried in order if the primary model is ever retired (the API answers 404).
// A retired model used to take every AI feature down silently, so fail over instead.
const FALLBACK_MODELS = ["claude-sonnet-5", "claude-sonnet-4-6"];

export function createAnthropic(apiKey: string): Anthropic {
  const client = new Anthropic({ apiKey });
  const messages = client.messages;
  const original = messages.create.bind(messages) as (
    params: Anthropic.Messages.MessageCreateParamsNonStreaming,
    options?: Anthropic.RequestOptions
  ) => Promise<Anthropic.Messages.Message>;

  messages.create = (async (
    params: Anthropic.Messages.MessageCreateParamsNonStreaming,
    options?: Anthropic.RequestOptions
  ) => {
    const models = [params.model, ...FALLBACK_MODELS.filter((m) => m !== params.model)];
    let lastError: unknown;
    for (const model of models) {
      try {
        return await original({ ...params, model }, options);
      } catch (err) {
        lastError = err;
        if (!(err instanceof Anthropic.NotFoundError)) throw err;
        console.error(`AI model "${model}" was not found, trying the next fallback`);
      }
    }
    throw lastError;
  }) as typeof messages.create;

  return client;
}
