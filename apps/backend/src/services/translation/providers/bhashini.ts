import { TranslationError, TranslationProvider, TranslationRequest } from '../types.js';

/**
 * Bhashini — the Government of India's own translation mission (ULCA).
 *
 * For a register of government schemes this is the most defensible source:
 * it is the same national programme the department portals draw on, and it
 * handles administrative vocabulary better than a general-purpose model.
 * Free, but it needs a userId/API key pair from bhashini.gov.in.
 *
 * The call is two steps by design: ask the pipeline config endpoint which
 * service can do en→xx, then post the text to the endpoint it names.
 */
export class BhashiniTranslationProvider implements TranslationProvider {
  readonly name = 'bhashini';

  private readonly configUrl =
    process.env.BHASHINI_CONFIG_URL ||
    'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';

  private readonly pipelineId =
    process.env.BHASHINI_PIPELINE_ID || '64392f96daac500b55c543cd';

  isConfigured(): boolean {
    return Boolean(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY);
  }

  /** Cached so a 300-string run resolves the pipeline once, not 300 times. */
  private pipeline?: { endpoint: string; serviceId: string; authKey: string; authValue: string };

  private async resolvePipeline(targetLang: string) {
    if (this.pipeline) return this.pipeline;

    const res = await fetch(this.configUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        userID: process.env.BHASHINI_USER_ID as string,
        ulcaApiKey: process.env.BHASHINI_API_KEY as string
      },
      body: JSON.stringify({
        pipelineTasks: [
          { taskType: 'translation', config: { language: { sourceLanguage: 'en', targetLanguage: targetLang } } }
        ],
        pipelineRequestConfig: { pipelineId: this.pipelineId }
      })
    });

    if (!res.ok) {
      throw new TranslationError(`Bhashini pipeline config failed (${res.status})`, this.name);
    }

    const body = (await res.json()) as any;
    const config = body?.pipelineResponseConfig?.[0]?.config?.[0];
    const inference = body?.pipelineInferenceAPIEndPoint;

    if (!config?.serviceId || !inference?.callbackUrl) {
      throw new TranslationError('Bhashini returned no usable pipeline', this.name);
    }

    this.pipeline = {
      endpoint: inference.callbackUrl,
      serviceId: config.serviceId,
      authKey: inference.inferenceApiKey?.name,
      authValue: inference.inferenceApiKey?.value
    };
    return this.pipeline;
  }

  async translate(request: TranslationRequest): Promise<string> {
    const [only] = await this.translateBatch([request]);
    return only;
  }

  async translateBatch(requests: TranslationRequest[]): Promise<string[]> {
    if (requests.length === 0) return [];
    if (!this.isConfigured()) {
      throw new TranslationError('BHASHINI_USER_ID / BHASHINI_API_KEY are not set', this.name);
    }

    const targetLang = requests[0].targetLang;
    const pipeline = await this.resolvePipeline(targetLang);

    try {
      const res = await fetch(pipeline.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pipeline.authKey ? { [pipeline.authKey]: pipeline.authValue } : {})
        },
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: { sourceLanguage: 'en', targetLanguage: targetLang },
                serviceId: pipeline.serviceId
              }
            }
          ],
          inputData: { input: requests.map((r) => ({ source: r.text })) }
        })
      });

      if (!res.ok) {
        throw new TranslationError(`Bhashini translation failed (${res.status})`, this.name);
      }

      const body = (await res.json()) as any;
      const output = body?.pipelineResponse?.[0]?.output ?? [];
      return requests.map((_, i) => output[i]?.target ?? '');
    } catch (error) {
      if (error instanceof TranslationError) throw error;
      throw new TranslationError('Bhashini translation failed', this.name, error);
    }
  }
}
