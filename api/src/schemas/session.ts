import { z } from "zod";

export const preferencePathwayEnum = z.enum([
  "Conventional",
  "Conventional incl. ESG",
  "Sustainability: Improvers",
  "Sustainability: Focus",
  "Sustainability: Impact",
  "Sustainability: Mixed Goals",
  "Ethical",
  "Philanthropy"
]);

export const pathwayAllocationSchema = z.object({
  name: preferencePathwayEnum,
  allocation_pct: z.number().min(0).max(100),
  themes: z.array(z.string()).optional(),
  impact_goals: z.array(z.string()).optional(),
  uses_sdgs: z.boolean().optional()
});

export const sessionSchema = z.object({
  client: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().optional()
    }),
    risk: z.object({
      atr: z.enum(["Cautious", "Balanced", "Adventurous"]),
      cfl: z.enum(["Low", "Medium", "High"]),
      horizon_years: z.number().int().min(1)
    })
  }),
  acknowledgements: z.object({
    read_informed_choice: z.boolean(),
    timestamp: z.string().datetime()
  }),
  preferences: z.object({
    pathways: z.array(pathwayAllocationSchema),
    ethical: z
      .object({
        enabled: z.boolean().optional(),
        exclusions: z.array(z.string()).optional()
      })
      .optional(),
    stewardship: z
      .object({
        discretion: z.enum(["fund_manager", "client_questionnaire"]) 
      })
      .optional()
  }),
  products: z
    .array(
      z.object({
        wrapper: z.string()
      })
    )
    .optional(),
  adviser_notes: z.string().optional(),
  fees: z
    .object({
      bespoke: z.boolean().optional(),
      explanation: z.string().optional()
    })
    .optional(),
  audit: z
    .object({
      events: z.array(z.unknown()).optional(),
      ip: z.string().optional()
    })
    .optional(),
  report: z.object({
    version: z.string(),
    doc_url: z.string().url().nullable().optional(),
    signed_url: z.string().url().nullable().optional()
  })
});

export type SessionPayload = z.infer<typeof sessionSchema>;

export const validateSessionPayload = (payload: unknown) => {
  const parsed = sessionSchema.parse(payload);

  const allocationTotal = parsed.preferences.pathways.reduce(
    (sum, pathway) => sum + pathway.allocation_pct,
    0
  );

  if (Math.round(allocationTotal) !== 100) {
    throw new Error("Pathway allocations must sum to 100%.");
  }

  const requiresThemes = parsed.preferences.pathways.some(
    (pathway) =>
      (pathway.name === "Sustainability: Focus" ||
        pathway.name === "Sustainability: Impact" ||
        pathway.name === "Sustainability: Mixed Goals") &&
      pathway.uses_sdgs
  );

  if (requiresThemes) {
    const hasSupportingDetail = parsed.preferences.pathways.some((pathway) => {
      const hasThemes = pathway.themes && pathway.themes.length > 0;
      const hasImpactGoals =
        pathway.impact_goals && pathway.impact_goals.length > 0;
      return hasThemes || hasImpactGoals;
    });

    if (!hasSupportingDetail) {
      throw new Error(
        "At least one SDG theme or impact goal must be provided for SDG-enabled pathways."
      );
    }
  }

  if (parsed.preferences.ethical?.enabled) {
    const exclusions = parsed.preferences.ethical.exclusions ?? [];
    if (exclusions.length === 0) {
      throw new Error("Ethical pathway requires at least one exclusion when enabled.");
    }
  }

  return parsed;
};
