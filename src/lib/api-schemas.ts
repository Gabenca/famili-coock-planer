import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()));

const positiveNumberSchema = z.number().finite().positive();

const mealSlotSchema = z.enum(["breakfast", "lunch", "snack", "dinner"]);

export const authBodySchema = z
  .object({
    inviteToken: z.string().trim().min(1).optional()
  })
  .partial();

export const recipeCreateSchema = z.object({
  title: z.string().trim().min(1),
  instructions: z.string().trim().min(1),
  servings: z.number().int().positive().optional().default(2),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: positiveNumberSchema,
        unit: z.string().trim().min(1)
      })
    )
    .min(1)
});

export const mealPlanCreateSchema = z.object({
  date: dateOnlySchema,
  slot: mealSlotSchema,
  recipeId: z.string().trim().min(1),
  servingsMultiplier: positiveNumberSchema
});

export const mealPlanUpdateSchema = z.object({
  servingsMultiplier: positiveNumberSchema
});

export const shoppingManualItemSchema = z.object({
  weekStart: dateOnlySchema,
  name: z.string().trim().min(1),
  quantity: positiveNumberSchema,
  unit: z.string().trim().min(1)
});

export const shoppingCheckStateSchema = z.object({
  weekStart: dateOnlySchema,
  itemKey: z.string().trim().min(1),
  checked: z.boolean()
});

export const weekStartQuerySchema = z.object({
  weekStart: dateOnlySchema
});

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema): Promise<z.infer<TSchema>> {
  return schema.parse(await request.json());
}

export function parseWeekStart(value: string | null) {
  return weekStartQuerySchema.parse({ weekStart: value }).weekStart;
}

export function isApiInputValidationError(error: unknown) {
  return error instanceof z.ZodError || error instanceof SyntaxError;
}
