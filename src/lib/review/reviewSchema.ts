/**
 * JSON schema for the structured `ReviewPlan` output. Shared by every
 * provider so behavior is consistent regardless of which model produced it.
 *
 * Every field is listed in `required` (including ones that are conceptually
 * optional, like `hunkId`) with a nullable type where needed — this matches
 * both Anthropic's `output_config.format` and OpenAI-style "strict" JSON
 * schema mode, which both want every property declared as required.
 */
export const REVIEW_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    units: {
      type: "array",
      description:
        "Review units in the order the human should walk through them: model/schema changes first, then the logic that changes because of them, then consumers/call-sites, then tests and generated/config files last.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Stable slug id, e.g. 'add-retry-policy-field'." },
          title: {
            type: "string",
            description: "Short human title for this review unit, e.g. 'Add retryPolicy field to Job model'.",
          },
          context: {
            type: "string",
            description:
              "Why this change was made, inferred from the PR description and the diff. Assume the reviewer already understands the code; convey the intent and context behind the change rather than telling them what to check or verify. 2-5 sentences.",
          },
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fileId: { type: "string", description: "The file path exactly as it appears in the diff." },
                hunkIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "IDs of the specific hunks in this file relevant to this unit, formatted 'path#index'. Empty array means the whole file.",
                },
                role: {
                  type: "string",
                  enum: [
                    "schema_or_model",
                    "core_logic",
                    "consumer_or_call_site",
                    "test",
                    "config_or_generated",
                  ],
                },
              },
              required: ["fileId", "hunkIds", "role"],
              additionalProperties: false,
            },
          },
        },
        required: ["id", "title", "context", "files"],
        additionalProperties: false,
      },
    },
  },
  required: ["units"],
  additionalProperties: false,
} as const;
