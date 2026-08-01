import { FILE_ROLES, UNIT_KINDS } from "../types";

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
        "Review units in walk order. For each feature: change unit(s) first, then the matching tests unit. Never mix production and test files in one unit.",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Unique kebab-case slug (e.g. 'add-retry-policy'). Tests units end with '-tests'.",
          },
          kind: {
            type: "string",
            enum: UNIT_KINDS,
            description:
              "'change' = production and optional config only. 'tests' = test files only. Never mix.",
          },
          title: {
            type: "string",
            description: "Short human title for this review unit.",
          },
          context: {
            type: "string",
            description:
              "Why this change was made (intent from PR description and diff). Not a verify/check list. 2-5 sentences.",
          },
          files: {
            type: "array",
            description: "Files for this unit only.",
            items: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "The file path exactly as it appears in the diff.",
                },
                hunkIds: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Hunk ids for this unit ('path#index'). Empty array = whole file (only when every hunk belongs here).",
                },
                role: {
                  type: "string",
                  enum: FILE_ROLES,
                  description:
                    "schema_or_model | core_logic | consumer_or_call_site | test | config_or_generated",
                },
              },
              required: ["fileId", "hunkIds", "role"],
              additionalProperties: false,
            },
          },
        },
        required: ["id", "kind", "title", "context", "files"],
        additionalProperties: false,
      },
    },
  },
  required: ["units"],
  additionalProperties: false,
} as const;
