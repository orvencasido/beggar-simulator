import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { applyAction, previewWorkWeek, type Catalog, type GameAction, type GameState } from '@/game-core';
import { supabase } from '@/lib/supabase/client';
import { gameStorage } from '@/storage/game-storage';
import { LocalController, type SaveRecord } from './local-controller';
import { bootstrap, gameMode, getLeaderboard, getPublicProfile, getMyShowcase, initializeAuth, LegacyMigrationRequired, saveShowcase, submit, validSavedRecord } from './transport-v2';
import type { Leaderboard, PublicProfile, ShowcaseSettings } from './types-v2';

interface GameContextValue {
  state: GameState | null; catalog: Catalog | null; loading: boolean; busy: boolean; error: string | null;
  mode: 'demo' | 'cloud'; syncStatus: 'loading' | 'saving' | 'saved' | 'syncing' | 'offline' | 'paused';
  pendingCount: number; lastSyncedAt: number | null; legacyMigrationRequired: boolean; legacyRecord: unknown;
  account: { linked: boolean; email: string | null }; weekRunning: boolean;
  act(action: GameAction): Promise<boolean>; work(): Promise<boolean>; eat(id: string): Promise<boolean>; rest(): Promise<boolean>;
  study(): Promise<boolean>; checkup(): Promise<boolean>; buyItem(id: string): Promise<boolean>; chooseJob(id: string): Promise<boolean>;
  enroll(qualificationId: string, collegeId: string): Promise<boolean>; equip(id: string): Promise<boolean>; travel(id: string): Promise<boolean>;
  deposit(amount: string): Promise<boolean>; withdraw(amount: string): Promise<boolean>;
  bankSettings(autoSave: boolean, autoWithdraw: boolean, reserve: string): Promise<boolean>;
  selectGoal(id: string | null): Promise<boolean>; selectAmbition(id: string | null): Promise<boolean>;
  acceptContract(id: string): Promise<boolean>; declineContract(id: string): Promise<boolean>; abandonContract(): Promise<boolean>;
  rebirth(): Promise<boolean>; workWeek(): Promise<boolean>; cancelWeek(): void;
  refresh(): Promise<void>; sync(): Promise<void>; takeOver(): Promise<void>; acknowledgeLegacyMigration(): Promise<void>;
  linkAccount(email: string, password: string): Promise<void>; verifyAccount(email: string, token: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  getLeaderboard(jobId: string, force?: boolean): Promise<Leaderboard>; getPublicProfile(id: string): Promise<PublicProfile>;
  saveShowcase(settings: ShowcaseSettings): Promise<void>;
  getMyShowcase(): Promise<ShowcaseSettings>;
  getShowcaseDraft(): Promise<ShowcaseSettings | null>;
  setShowcaseDraft(settings: ShowcaseSettings): Promise<void>;
  clearShowcaseDraft(): Promise<void>;
}
const GameContext = createContext<GameContextValue | null>(null);
const saveKey = `rags:${gameMode}:lifetime:v2`;

export function GameProvider({ children }: { children: ReactNode }) {
  const [, setVersion] = useState(0);
  const mounted = useRef(true);
  const [account, setAccount] = useState({ linked: false, email: null as string | null });
  const [legacy, setLegacy] = useState<{required:boolean;record:unknown}>({ required: false, record: null });
  const [weekRunning, setWeekRunning] = useState(false);
  const weekCancelled = useRef(false);
  const acknowledged = useRef(false);
  const owner = useRef<string | null>(null);
  // Constructor stores callbacks; refs are read only when the controller runs after render.
  // eslint-disable-next-line react-hooks/refs
  const [controller] = useState(() => new LocalController<GameState, Catalog, GameAction>({
    mode: gameMode, key: saveKey, store: gameStorage, now: Date.now, uuid: Crypto.randomUUID,
    bootstrap: async (deviceId, takeover) => {
      try { return await bootstrap(deviceId, Crypto.randomUUID(), acknowledged.current, takeover); }
      catch (error) {
        if (error instanceof LegacyMigrationRequired && mounted.current) setLegacy({ required: true, record: error.legacy });
        throw error;
      }
    },
    ownerId: gameMode === 'cloud' ? async () => { const id = await initializeAuth(); owner.current = id; return id; } : undefined,
    currentOwnerId: () => owner.current,
    submit, reduce: (state, action, catalog, nextCatalog) => applyAction(state, action, nextCatalog && state.catalogVersion === nextCatalog.manifest.version ? nextCatalog : catalog, nextCatalog),
    catalogVersion: catalog => catalog.manifest.version,
    validate: (value): value is SaveRecord<GameState, Catalog, GameAction> => validSavedRecord(value),
    onChange: () => { if (mounted.current) setVersion(value => value + 1); },
  }));
  const sync = useCallback(async () => { await controller.sync(); }, [controller]);
  const refresh = useCallback(async () => {
    try {
      if (controller.record?.ownerId && owner.current !== controller.record.ownerId) await controller.changeAccount();
      else if (!controller.record) await controller.initialize();
      else if (controller.dirty || controller.record.frozen) await controller.sync();
      else await controller.refresh();
    } catch (error) { controller.setError(error instanceof Error ? error.message : 'Could not reconnect.'); if (mounted.current) setVersion(value => value + 1); }
  }, [controller]);
  useEffect(() => {
    mounted.current = true;
    void controller.initialize();
    const auth = supabase?.auth.onAuthStateChange((_event, session) => {
      owner.current = session?.user.id ?? null;
      if (controller.record?.ownerId && owner.current !== controller.record.ownerId) { controller.hideChangedAccount(); if (mounted.current) setVersion(value => value + 1); }
      if (mounted.current) setAccount({ linked: Boolean(session && !session.user.is_anonymous && session.user.email_confirmed_at), email: session?.user.email ?? null });
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && controller.dirty) void controller.sync();
      else if (controller.paused && mounted.current) setVersion(value => value + 1);
    }, 30_000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (Platform.OS !== 'web') supabase?.auth.startAutoRefresh();
        void refresh();
      } else {
        weekCancelled.current = true;
        if (Platform.OS !== 'web') supabase?.auth.stopAutoRefresh();
        if (controller.dirty) void controller.sync();
      }
    });
    return () => { mounted.current = false; weekCancelled.current = true; clearInterval(timer); subscription.remove(); auth?.data.subscription.unsubscribe(); };
  }, [controller, refresh]);

  const act = useCallback(async (action: GameAction) => {
    if (action.type === 'rebirth' && gameMode === 'cloud') {
      await controller.sync();
      if (controller.dirty || controller.record?.frozen) return false;
      await controller.refresh(); // Fetch the currently activated catalog at the life boundary.
    }
    const pending = controller.act(action);
    if (action.type === 'rebirth' && gameMode === 'cloud') controller.setBlocked(true);
    const accepted = await pending;
    if (!accepted && action.type === 'rebirth') controller.setBlocked(false);
    // A newly activated catalog is adopted at rebirth; freeze until cloud confirms it.
    if (accepted && action.type === 'rebirth' && gameMode === 'cloud') await controller.sync();
    return accepted;
  }, [controller]);
  const workWeek = useCallback(async () => {
    if (weekRunning || !controller.state || !controller.catalog) return false;
    const preview = previewWorkWeek(controller.state, controller.catalog);
    if (!preview.actions.length) return false;
    weekCancelled.current = false; setWeekRunning(true);
    let completed = false;
    try {
      for (const action of preview.actions) {
        if (weekCancelled.current) break;
        if (!await act(action)) break;
        completed = true;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      return completed;
    } finally { if (mounted.current) setWeekRunning(false); }
  }, [act, controller, weekRunning]);
  const accountOperation = async (operation: () => Promise<{error: Error | null}>) => {
    const { error } = await operation();
    if (error) throw new Error(error.message);
  };
  const value: GameContextValue = {
    state: controller.state, catalog: controller.catalog, loading: controller.loading, busy: controller.loading,
    error: controller.error, mode: gameMode, pendingCount: controller.pendingCount,
    lastSyncedAt: controller.record?.lastSyncAt ?? null, account, legacyMigrationRequired: legacy.required, legacyRecord: legacy.required ? legacy.record : controller.record?.checkpoint.legacyV1 ?? null,
    weekRunning,
    syncStatus: controller.loading ? 'loading' : controller.paused ? 'paused' : controller.syncing ? 'syncing' : controller.saving ? 'saving' : controller.networkError ? 'offline' : 'saved',
    act, work: () => act({type:'work'}), eat: id => act({type:'eat',item_id:id}), rest: () => act({type:'rest'}),
    study: () => act({type:'study'}), checkup: () => act({type:'checkup'}), buyItem: id => act({type:'buy_item',item_id:id}),
    chooseJob: id => act({type:'choose_job',job_id:id}), enroll: (qualificationId,collegeId) => act({type:'enroll',qualification_id:qualificationId,college_id:collegeId}),
    equip: id => act({type:'equip',item_id:id}), travel: id => act({type:'travel',item_id:id}),
    deposit: amount => act({type:'deposit',amount}), withdraw: amount => act({type:'withdraw',amount}),
    bankSettings: (autoSave,autoWithdraw,reserve) => act({type:'bank_settings',auto_save:autoSave,auto_withdraw:autoWithdraw,reserve}),
    selectGoal: id => act({type:'select_goal',goal_id:id}), selectAmbition: id => act({type:'select_ambition',ambition_id:id}),
    acceptContract: id => act({type:'accept_contract',offer_id:id}), declineContract: id => act({type:'decline_contract',offer_id:id}),
    abandonContract: () => act({type:'abandon_contract'}), rebirth: () => act({type:'rebirth'}), workWeek,
    cancelWeek: () => { weekCancelled.current = true; }, sync, refresh,
    takeOver: async () => { await controller.takeOver(); },
    acknowledgeLegacyMigration: async () => {
      acknowledged.current = true;
      const prior = await gameStorage.get(gameMode === 'demo' ? 'rags:demo:v1' : 'rags:cloud:snapshot:v1');
      if (prior) await gameStorage.set(`rags:${gameMode}:archive:v1`, prior);
      await controller.initialize();
      if (controller.state && mounted.current) setLegacy({ required: false, record: legacy.record });
    },
    linkAccount: async (email,password) => {
      if (!supabase || gameMode !== 'cloud') throw new Error('Account linking requires ranked mode.');
      await accountOperation(() => supabase!.auth.updateUser({ email: email.trim(), password }));
    },
    verifyAccount: async (email,token) => {
      if (!supabase) throw new Error('Ranked mode is unavailable.');
      await accountOperation(() => supabase!.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email_change' }));
    },
    signIn: async (email,password) => {
      if (!supabase) throw new Error('Ranked mode is unavailable.');
      if (controller.dirty || controller.record?.frozen) throw new Error('Sync pending progress before changing accounts.');
      await accountOperation(() => supabase!.auth.signInWithPassword({ email: email.trim(), password }));
      await controller.changeAccount();
    },
    getLeaderboard, getPublicProfile, getMyShowcase,
    getShowcaseDraft: async () => {
      const saved = await gameStorage.get(`${controller.storageKey}:showcase-draft`);
      return saved ? JSON.parse(saved) as ShowcaseSettings : null;
    },
    setShowcaseDraft: settings => gameStorage.set(`${controller.storageKey}:showcase-draft`, JSON.stringify(settings)),
    clearShowcaseDraft: () => gameStorage.remove(`${controller.storageKey}:showcase-draft`),
    saveShowcase: async settings => {
      if (!account.linked && settings.visible) throw new Error('Link your account before joining public rankings.');
      await controller.sync();
      if (controller.dirty) throw new Error('Sync your achievements before publishing your showcase.');
      await saveShowcase(settings);
    },
  };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
export function useGame() {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame must be used inside GameProvider.');
  return game;
}
