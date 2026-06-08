import { getModel } from "@earendil-works/pi-ai";
import type { Api, Model } from "@earendil-works/pi-ai";
import type {
  ExtensionAPI,
  ProviderModelConfig,
} from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "coreinfra";
const PROVIDER_NAME = "CoreInfra AI Hub";
const DEFAULT_HUB_BASE_URL = "https://hub.coreinfra.ai";
const FETCH_TIMEOUT_MS = 10_000;
type CoreInfraFamily = "openai" | "anthropic";

type CoreInfraPrices = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_5m_write_tokens?: number;
  cache_1h_write_tokens?: number;
};

type HubResponse = {
  providers?: Partial<
    Record<
      CoreInfraFamily,
      { models?: Record<string, { display_name?: string; prices?: CoreInfraPrices }> }
    >
  >;
};

function hubBaseUrl(): string {
  return (process.env.COREINFRA_HUB_BASE_URL ?? DEFAULT_HUB_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

function openAiBaseUrl(): string {
  return `${hubBaseUrl()}/codex/api/v1`;
}

function anthropicBaseUrl(): string {
  return `${hubBaseUrl()}/claude/api`;
}

async function fetchHubModels(): Promise<HubResponse> {
  const res = await fetch(`${hubBaseUrl()}/hub/api/prices`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch CoreInfra models: ${res.status} ${res.statusText}`,
    );
  }

  return (await res.json()) as HubResponse;
}

function modelCost(prices: CoreInfraPrices = {}): ProviderModelConfig["cost"] {
  return {
    input: prices.input_tokens ?? 0,
    output: prices.output_tokens ?? 0,
    cacheRead: prices.cache_read_tokens ?? 0,
    cacheWrite: prices.cache_5m_write_tokens ?? prices.cache_1h_write_tokens ?? 0,
  };
}

function builtinModel(
  family: CoreInfraFamily,
  modelId: string,
): Model<Api> | undefined {
  return getModel(family, modelId as never) as Model<Api> | undefined;
}

function familyConfig(family: CoreInfraFamily): {
  api: "openai-responses" | "anthropic-messages";
  baseUrl: string;
} {
  if (family === "anthropic") {
    return { api: "anthropic-messages", baseUrl: anthropicBaseUrl() };
  }

  return { api: "openai-responses", baseUrl: openAiBaseUrl() };
}

function buildModels(hub: HubResponse): {
  models: ProviderModelConfig[];
  warnings: string[];
} {
  const models: ProviderModelConfig[] = [];
  const warnings: string[] = [];

  for (const family of ["openai", "anthropic"] as const) {
    const hubModels = hub.providers?.[family]?.models ?? {};
    const { api, baseUrl } = familyConfig(family);

    for (const [modelId, hubModel] of Object.entries(hubModels)) {
      const builtin = builtinModel(family, modelId);
      if (!builtin) {
        warnings.push(`${family}/${modelId} is not known to pi; skipping`);
        continue;
      }

      models.push({
        id: modelId,
        name: hubModel.display_name ?? builtin.name,
        api,
        baseUrl,
        reasoning: builtin.reasoning,
        thinkingLevelMap: builtin.thinkingLevelMap,
        input: builtin.input,
        cost: modelCost(hubModel.prices),
        contextWindow: builtin.contextWindow,
        maxTokens: builtin.maxTokens,
        compat: builtin.compat,
      });
    }
  }

  return { models, warnings };
}

export default async function coreInfraPiPlugin(pi: ExtensionAPI) {
  const { models, warnings } = buildModels(await fetchHubModels());

  pi.registerProvider(PROVIDER_ID, {
    name: PROVIDER_NAME,
    baseUrl: openAiBaseUrl(),
    apiKey: "$COREINFRA_API_KEY",
    api: "openai-responses",
    models,
  });

  for (const warning of warnings) {
    console.warn(`[${PROVIDER_ID}] ${warning}`);
  }
}
