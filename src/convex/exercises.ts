import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';

type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
type LoadingMode = 'bar' | 'pair' | 'single';

export const seedBasics = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const basics: Array<{ name: string; bodyPart: string; isWeighted: boolean; equipment?: Equipment; loadingMode?: LoadingMode; roundingIncrementKg?: number; roundingIncrementLbs?: number }> = [
      { name: 'Back Squat', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 2.5 },
      { name: 'Front Squat', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 2.5 },
      { name: 'Leg Press', bodyPart: 'legs', isWeighted: true, equipment: 'machine', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
      { name: 'Walking Lunge', bodyPart: 'legs', isWeighted: true, equipment: 'dumbbell', loadingMode: 'pair', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
      { name: 'Romanian Deadlift', bodyPart: 'legs', isWeighted: true, equipment: 'barbell', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 2.5 },
      { name: 'Push-up', bodyPart: 'chest', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
      { name: 'Pull-up', bodyPart: 'back', isWeighted: false, equipment: 'bodyweight', loadingMode: 'bar', roundingIncrementKg: 2.5, roundingIncrementLbs: 5 },
    ];
    for (const e of basics) {
      await ctx.db.insert('exercises', { ...e, createdAt: now });
    }
    return basics.length;
  },
});

export const byBodyPart = query({
  args: { bodyPart: v.string() },
  handler: async (ctx, { bodyPart }) => {
    return await ctx.db
      .query('exercises')
      .withIndex('by_body_part', q => q.eq('bodyPart', bodyPart))
      .collect();
  },
});

export const getMultiple = query({
  args: { exerciseIds: v.optional(v.array(v.id('exercises'))) },
  handler: async (ctx, { exerciseIds }) => {
    if (!exerciseIds || exerciseIds.length === 0) return [];
    const exercises = await Promise.all(
      exerciseIds.map(id => ctx.db.get(id))
    );
    return exercises.filter(Boolean);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('exercises')
      .collect();
  },
});

export const getById = query({
  args: { exerciseId: v.optional(v.id('exercises')) },
  handler: async (ctx, { exerciseId }) => {
    if (!exerciseId) return null;
    return await ctx.db.get(exerciseId);
  },
});

export const updateExercise = mutation({
  args: {
    exerciseId: v.id('exercises'),
    name: v.optional(v.string()),
    bodyPart: v.optional(v.string()),
    isWeighted: v.optional(v.boolean()),
    gifUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    equipment: v.optional(v.union(
      v.literal('barbell'), v.literal('dumbbell'), v.literal('machine'), v.literal('kettlebell'), v.literal('cable'), v.literal('bodyweight')
    )),
    loadingMode: v.optional(v.union(
      v.literal('bar'), v.literal('pair'), v.literal('single')
    )),
    roundingIncrementKg: v.optional(v.number()),
    roundingIncrementLbs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.exerciseId);
    if (!existing) throw new Error('Exercise not found');
    const update: Partial<{ name: string; bodyPart: string; isWeighted: boolean; gifUrl?: string; description?: string; equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight'; loadingMode?: 'bar' | 'pair' | 'single'; roundingIncrementKg?: number; roundingIncrementLbs?: number; }> = {};
    (['name','bodyPart','isWeighted','gifUrl','description','equipment','loadingMode','roundingIncrementKg','roundingIncrementLbs'] as const).forEach((key) => {
      if (args[key] !== undefined) (update as any)[key] = args[key as keyof typeof args];
    });
    await ctx.db.patch(args.exerciseId, update);
    return true;
  },
});

export const deleteExercise = mutation({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    const existing = await ctx.db.get(exerciseId);
    if (!existing) return false;
    await ctx.db.delete(exerciseId);
    return true;
  },
});


