import { z } from "zod";
import { DASHBOARD_WIDGET_KEYS, TRIP_NAVIGATION_KEYS } from "~/lib/trip-config";
import { PACKING_PRESET_KEYS } from "~/lib/packing";
import { TRIP_THEME_KEYS } from "~/lib/themes";

export const joinPinSchema = z.string().regex(/^\d{6}$/);
export const userPinSchema = z.string().regex(/^\d{4}$/);

const nullableText = (max: number) => z.string().trim().max(max).nullable();
const nullableUrl = z.string().trim().url().max(1000).nullable();
const financeModeSchema = z.enum(["legacy", "whole", "precise"]);
const settlementStrategySchema = z.enum(["relational", "optimized"]);
const expenseVisibilitySchema = z.enum(["everyone", "managers", "selected"]);
const currencySchema = z.enum(["PLN", "EUR", "USD", "GBP", "CHF", "CZK", "HUF"]);
const tripThemeSchema = z.enum(TRIP_THEME_KEYS);

const tripModulesSchema = z.object({
  schedule: z.boolean(),
  shopping: z.boolean(),
  scoreboard: z.boolean(),
  finances: z.boolean(),
  packing: z.boolean(),
  quests: z.boolean(),
  playlist: z.boolean(),
});

const tripDetailsSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    destinationName: nullableText(120),
    destinationAddress: nullableText(300),
    destinationMapUrl: nullableUrl,
    defaultCurrency: currencySchema,
    playlistUrl: nullableUrl,
    modules: tripModulesSchema,
    dashboardWidgets: z.array(z.enum(DASHBOARD_WIDGET_KEYS)).max(DASHBOARD_WIDGET_KEYS.length),
  })
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    "Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.",
  );

export const createTripSchema = tripDetailsSchema.and(
  z.object({
    adminName: z.string().trim().min(1).max(60),
    adminPin: userPinSchema,
    members: z.array(z.string().trim().min(1).max(60)).max(100),
    teams: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1).max(60),
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        }),
      )
      .max(20),
    memberAssignments: z.record(z.string(), z.string()),
    packingPresets: z.array(z.enum(PACKING_PRESET_KEYS)).max(PACKING_PRESET_KEYS.length),
  }),
);

export const updateTripSettingsSchema = tripDetailsSchema.and(
  z.object({
    tripKey: z.string().regex(/^[0-9a-f]{12}$/),
    theme: tripThemeSchema,
    financeMode: financeModeSchema,
    settlementStrategy: settlementStrategySchema,
    expenseVisibility: expenseVisibilitySchema,
    expenseViewerIds: z.array(z.string().uuid()).max(100),
    navigation: z.array(z.enum(TRIP_NAVIGATION_KEYS)).max(TRIP_NAVIGATION_KEYS.length),
  }),
);

export const updateParticipantProfileSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  name: z.string().trim().min(1).max(60),
  avatarUrl: nullableUrl,
  phone: nullableText(40),
  revolutUrl: nullableText(300),
  paymentNote: nullableText(500),
  newPin: z
    .string()
    .regex(/^\d{4}$/)
    .nullable(),
});

export const addParticipantSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  name: z.string().trim().min(1).max(60),
  isAdmin: z.boolean(),
  teamId: z.string().uuid().nullable(),
});

export const updateParticipantSchema = addParticipantSchema.extend({
  userId: z.string().uuid(),
});

export const deleteParticipantSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  userId: z.string().uuid(),
});

export const teamSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const updateTeamSchema = teamSchema.extend({ teamId: z.string().uuid() });

export const deleteTeamSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  teamId: z.string().uuid(),
});

export const setTripStatusSchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  status: z.enum(["active", "closed"]),
});

export const deleteTripPermanentlySchema = z.object({
  tripKey: z.string().regex(/^[0-9a-f]{12}$/),
  confirmationName: z.string().min(2).max(80),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripSettingsInput = z.infer<typeof updateTripSettingsSchema>;
export type UpdateParticipantProfileInput = z.infer<typeof updateParticipantProfileSchema>;
