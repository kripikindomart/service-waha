import { Injectable, ServiceUnavailableException } from '@nestjs/common';

function enabled(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

@Injectable()
export class FeatureFlagsService {
  get aiAgentV2() { return enabled(process.env.AI_AGENT_V2_ENABLED, false); }

  assertAiAgentV2() {
    if (!this.aiAgentV2) throw new ServiceUnavailableException('ai_agent_v2_disabled');
  }
}
