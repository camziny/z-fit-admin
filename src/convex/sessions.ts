import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';

type AssessmentDoc = {
  userId?: Id<'users'>;
  anonKey?: string;
  exerciseId: Id<'exercises'>;
  type: '1rm' | 'working';
  value: number;
  unit: 'kg' | 'lbs';
  createdAt: number;
};

type SessionExerciseSet = {
  reps: number;
  weight?: number;
  done: boolean;
  completedReps?: number;
  completedWeight?: number;
  completedAt?: number;
};

type SessionExercise = {
  exerciseId: Id<'exercises'>;
  exerciseName: string;
  equipment?: 'barbell' | 'dumbbell' | 'machine' | 'kettlebell' | 'cable' | 'bodyweight';
  loadingMode?: 'bar' | 'pair' | 'single';
  loadBasis: 'external' | 'bodyweight';
  order: number;
  groupId?: string;
  groupOrder?: number;
  restSec?: number;
  rir?: number;
  sets: SessionExerciseSet[];
};

type SessionDoc = {
  _id: Id<'sessions'>;
  userId?: Id<'users'>;
  anonKey?: string;
  templateId?: Id<'templates'>;
  status: 'active' | 'completed';
  startedAt: number;
  completedAt?: number;
  createdAt: number;
  exercises: SessionExercise[];
};

async function resolveUserId(
  ctx: { auth: { getUserIdentity?: () => Promise<{ subject?: string; name?: string } | null> }; db: any },
  provided?: Id<'users'>
): Promise<Id<'users'> | undefined> {
  if (provided) return provided;
  const identity = await ctx.auth.getUserIdentity?.();
  if (!identity?.subject) return undefined;
  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q: any) => q.eq('clerkUserId', identity.subject))
    .first();
  if (existing) return existing._id as Id<'users'>;
  if (typeof ctx.db.insert !== 'function') return undefined;
  const now = Date.now();
  const newId = (await ctx.db.insert('users', {
    clerkUserId: identity.subject,
    displayName: identity.name ?? undefined,
    createdAt: now,
  })) as Id<'users'>;
  return newId;
}
export const recordAssessment = mutation({
  args: {
    userId: v.optional(v.id('users')),
    anonKey: v.optional(v.string()),
    exerciseId: v.id('exercises'),
    type: v.union(v.literal('1rm'), v.literal('working')),
    value: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
  },
  handler: async (ctx, { userId, anonKey, exerciseId, type, value, unit }) => {
    const resolvedUserForAssessment = userId ?? (await resolveUserId(ctx));
    await ctx.db.insert('assessments', {
      userId: resolvedUserForAssessment,
      anonKey,
      exerciseId,
      type,
      value,
      unit,
      createdAt: Date.now(),
    });
    return true;
  },
});

export const getLatestAssessments = query({
  args: { userId: v.optional(v.id('users')), anonKey: v.optional(v.string()), exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { userId, anonKey, exerciseIds }) => {
    const result: Record<string, AssessmentDoc> = {};
    let effectiveUserId = userId as Id<'users'> | undefined;
    if (!effectiveUserId && !anonKey) {
      effectiveUserId = await resolveUserId(ctx, undefined);
    }
    for (const exId of exerciseIds) {
      const items = (await ctx.db
        .query('assessments')
        .withIndex('by_exercise_created', (q) => q.eq('exerciseId', exId))
        .collect()) as AssessmentDoc[];
      let filtered = items;
      if (effectiveUserId) filtered = filtered.filter(i => i.userId && i.userId === effectiveUserId);
      else if (anonKey) filtered = filtered.filter(i => i.anonKey && i.anonKey === anonKey);
      const latest = filtered.reduce<AssessmentDoc | undefined>((acc, cur) => (acc && acc.createdAt > cur.createdAt ? acc : cur), undefined);
      if (latest) {
        result[exId] = latest;
      }
    }
    return result;
  },
});
export const getSession = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    return (await ctx.db.get(sessionId)) as SessionDoc | null;
  },
});

export const getLatestActiveSession = query({
  args: { userId: v.optional(v.id('users')), anonKey: v.optional(v.string()) },
  handler: async (ctx, { userId, anonKey }) => {
    let effectiveUserId = userId as Id<'users'> | undefined;
    if (!effectiveUserId && !anonKey) {
      effectiveUserId = await resolveUserId(ctx, undefined);
    }
    const sessions: SessionDoc[] = [];
    if (effectiveUserId) {
      const userSessions = (await ctx.db
        .query('sessions')
        .withIndex('by_user_started', (q) => q.eq('userId', effectiveUserId))
        .collect()) as SessionDoc[];
      sessions.push(...userSessions);
    }
    if (anonKey) {
      const anonSessions = (await ctx.db
        .query('sessions')
        .withIndex('by_anon_started', (q) => q.eq('anonKey', anonKey))
        .collect()) as SessionDoc[];
      sessions.push(...anonSessions);
    }
    const active = sessions
      .filter(s => s.status === 'active')
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0];
    return active ?? null;
  },
});

export const startFromTemplate = mutation({
  args: { 
    templateId: v.id('templates'), 
    userId: v.optional(v.id('users')), 
    anonKey: v.optional(v.string()),
    plannedWeights: v.optional(v.record(v.string(), v.number()))
  },
  handler: async (ctx, { templateId, userId, anonKey, plannedWeights = {} }) => {
    const resolvedUserId = await resolveUserId(ctx, userId as Id<'users'> | undefined);
    const template = await ctx.db.get(templateId);
    if (!template) throw new Error('Template not found');
    const now = Date.now();
    const itemsWithNames = await Promise.all(
      template.items
        .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
        .map(async (item: { exerciseId: Id<'exercises'>; order: number; groupId?: string; groupOrder?: number; sets: Array<{ reps: number; weight?: number; restSec?: number }> }) => {
          const ex = (await ctx.db.get(item.exerciseId)) as { name?: string; equipment?: SessionExercise['equipment']; loadingMode?: SessionExercise['loadingMode']; isWeighted?: boolean } | null;
          let plannedWeight = plannedWeights[item.exerciseId as unknown as string] as number | undefined;
          if (plannedWeight === undefined && resolvedUserId) {
            const prof = await ctx.db
              .query('progressionProfiles')
              .withIndex('by_user_exercise', (q) => q.eq('userId', resolvedUserId).eq('exerciseId', item.exerciseId))
              .first();
            if (prof?.nextPlannedWeightKg !== undefined) plannedWeight = prof.nextPlannedWeightKg;
          }
          const sets: SessionExerciseSet[] = item.sets.map((s) => ({ reps: s.reps, weight: plannedWeight || s.weight, done: false }));
          const exercise: SessionExercise = {
            exerciseId: item.exerciseId,
            exerciseName: ex?.name ?? '',
            equipment: ex?.equipment,
            loadingMode: ex?.loadingMode,
            loadBasis: ex?.isWeighted === false ? 'bodyweight' : 'external',
            order: item.order,
            groupId: item.groupId,
            groupOrder: item.groupOrder,
            restSec: item.sets[0]?.restSec,
            rir: undefined,
            sets,
          };
          return exercise;
        })
    );

    const sessionId = await ctx.db.insert('sessions', {
      userId: resolvedUserId,
      anonKey,
      templateId,
      status: 'active',
      startedAt: now,
      createdAt: now,
      exercises: itemsWithNames,
    });
    return sessionId as Id<'sessions'>;
  },
});

export const markSetDone = mutation({
  args: { sessionId: v.id('sessions'), exerciseIndex: v.number(), setIndex: v.number(), reps: v.optional(v.number()), weight: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const s = (await ctx.db.get(args.sessionId)) as SessionDoc | null;
    if (!s) throw new Error('Session not found');
    const ex = s.exercises[args.exerciseIndex];
    if (!ex) throw new Error('Exercise not found');
    const st = ex.sets[args.setIndex];
    if (!st) throw new Error('Set not found');
    st.done = true;
    st.completedAt = Date.now();
    if (args.reps !== undefined) st.completedReps = args.reps;
    if (args.weight !== undefined) st.completedWeight = args.weight;
    await ctx.db.replace(args.sessionId, s);
    return true;
  },
});

export const updatePlannedWeight = mutation({
  args: {
    sessionId: v.id('sessions'),
    exerciseIndex: v.number(),
    fromSetIndex: v.optional(v.number()),
    weightKg: v.number(),
  },
  handler: async (ctx, { sessionId, exerciseIndex, fromSetIndex, weightKg }) => {
    const s = (await ctx.db.get(sessionId)) as SessionDoc | null;
    if (!s) throw new Error('Session not found');
    const ex = s.exercises[exerciseIndex];
    if (!ex) throw new Error('Exercise not found');
    const start = fromSetIndex ?? 0;
    for (let i = start; i < ex.sets.length; i++) {
      const st = ex.sets[i];
      if (st.done) continue;
      st.weight = weightKg;
    }
    await ctx.db.replace(sessionId, s);
    return true;
  },
});

export const recordExerciseRIR = mutation({
  args: { sessionId: v.id('sessions'), exerciseIndex: v.number(), rir: v.number(), userId: v.optional(v.id('users')) },
  handler: async (ctx, { sessionId, exerciseIndex, rir, userId }) => {
    const s = (await ctx.db.get(sessionId)) as SessionDoc | null;
    if (!s) throw new Error('Session not found');
    const ex = s.exercises[exerciseIndex];
    if (!ex) throw new Error('Exercise not found');
    ex.rir = rir;

    const completed = [...ex.sets].reverse().find(st => st.completedWeight !== undefined || st.weight !== undefined);
    const lastCompletedWeightKg = (completed?.completedWeight ?? completed?.weight) ?? undefined;

    if (!s.userId) {
      const newUserId = await resolveUserId(ctx, userId as Id<'users'> | undefined);
      if (newUserId) s.userId = newUserId;
    }
    await ctx.db.replace(sessionId, s);

    const resolvedUserId = (userId as Id<'users'> | undefined) ?? s.userId ?? undefined;
    if (lastCompletedWeightKg !== undefined && resolvedUserId) {
      const profileQuery = ctx.db
        .query('progressionProfiles')
        .withIndex('by_user_exercise', (q) => q.eq('userId', resolvedUserId).eq('exerciseId', ex.exerciseId));
      const existing = await profileQuery.first();
      const now = Date.now();
      const nextPlannedWeightKg = computeNextPlannedWeight(lastCompletedWeightKg, rir);
      if (existing) {
        await ctx.db.patch(existing._id, {
          lastCompletedWeightKg,
          lastRIR: rir,
          nextPlannedWeightKg,
          lastUpdatedAt: now,
        });
      } else {
        await ctx.db.insert('progressionProfiles', {
          userId: resolvedUserId,
          exerciseId: ex.exerciseId,
          categoryKey: undefined,
          lastCompletedWeightKg,
          lastRIR: rir,
          nextPlannedWeightKg,
          lastUpdatedAt: now,
        });
      }
    }

    return true;
  },
});

function computeNextPlannedWeight(lastCompletedWeightKg: number, rir: number): number {
  const bigInc = 5;
  const smallInc = 2.5;
  if (rir >= 4) return lastCompletedWeightKg + bigInc;
  if (rir >= 1) return lastCompletedWeightKg + smallInc;
  return lastCompletedWeightKg;
}

export const completeSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const s = (await ctx.db.get(sessionId)) as SessionDoc | null;
    if (!s) throw new Error('Session not found');
    s.status = 'completed';
    s.completedAt = Date.now();
    await ctx.db.replace(sessionId, s);
    return true;
  },
});

export const historyForUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user_started', (q) => q.eq('userId', userId))
      .collect();
  },
});


export const getProgressionsForExercises = query({
  args: { userId: v.optional(v.id('users')), exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { userId, exerciseIds }) => {
    const result: Record<string, object> = {};
    const effectiveUserId = (userId as Id<'users'> | undefined) ?? (await resolveUserId(ctx, undefined));
    if (!effectiveUserId) return result;
    for (const exId of exerciseIds) {
      const prof = await ctx.db
        .query('progressionProfiles')
        .withIndex('by_user_exercise', (q) => q.eq('userId', effectiveUserId).eq('exerciseId', exId))
        .first();
      if (prof) {
        result[exId] = prof;
      }
    }
    return result;
  },
});

export const getLatestCompletedWeights = query({
  args: { userId: v.optional(v.id('users')), anonKey: v.optional(v.string()), exerciseIds: v.array(v.id('exercises')) },
  handler: async (ctx, { userId, anonKey, exerciseIds }) => {
    const result: Record<string, number> = {};
    const effectiveUserId = (userId as Id<'users'> | undefined) ?? (await resolveUserId(ctx, undefined));

    const sessions: SessionDoc[] = [];
    if (effectiveUserId) {
      const userSessions = (await ctx.db
        .query('sessions')
        .withIndex('by_user_started', (q) => q.eq('userId', effectiveUserId))
        .collect()) as SessionDoc[];
      sessions.push(...userSessions);
    }
    if (anonKey) {
      const anonSessions = (await ctx.db
        .query('sessions')
        .withIndex('by_anon_started', (q) => q.eq('anonKey', anonKey))
        .collect()) as SessionDoc[];
      sessions.push(...anonSessions);
    }

    sessions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

    for (const exId of exerciseIds) {
      if (result[exId]) continue;
      for (const s of sessions) {
        const ex = (s.exercises || []).find((e) => e.exerciseId === exId);
        if (!ex) continue;
        const st = [...(ex.sets || [])].reverse().find((st) => st.completedWeight !== undefined || st.weight !== undefined);
        const w = (st?.completedWeight ?? st?.weight) as number | undefined;
        if (w !== undefined) {
          result[exId] = w;
          break;
        }
      }
    }

    return result;
  },
});


