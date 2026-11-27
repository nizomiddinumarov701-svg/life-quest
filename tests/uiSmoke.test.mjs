import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GEAR_CATALOG,
  RARITY_META,
  REFUND_WINDOW_MS,
  computeDerivedState,
} from '../src/rpgEngine.js';
import { createSampleAdventureState } from '../src/storage.js';
import {
  renderActiveTimerBar,
  renderActivitiesView,
  renderDashboardView,
  renderModal,
  renderQuestsAndBadgesView,
  renderShopView,
  renderStatsView,
} from '../src/ui.js';

function assertCleanHtml(html, label) {
  assert.equal(typeof html, 'string', `${label} should return a string`);
  assert.ok(html.trim().length > 40, `${label} should render non-empty HTML`);
  assert.ok(!html.includes('undefined'), `${label} leaked "undefined" into HTML`);
  assert.ok(!html.includes('NaN'), `${label} leaked "NaN" into HTML`);
  assert.ok(!html.includes('[object Object]'), `${label} leaked "[object Object]" into HTML`);
}

test('All primary LifeQuest views render cleanly with zero NaN or undefined leaks', () => {
  const now = Date.now();
  const state = createSampleAdventureState(now);
  state.inventoryGear = [
    { id: 'g1', gearId: 'wpn_cyberdeck', obtainedAt: now, source: 'Smoke Test' },
  ];
  state.equippedGear = { weapon: 'wpn_cyberdeck', armor: null, relic: null, aura: null };
  state.rewardRedemptions = [
    {
      id: 'red_recent',
      rewardId: 'rew_gaming',
      title: 'Recent Treat',
      icon: '🎮',
      cost: 120,
      epic: false,
      redeemedAt: now - 2 * 60 * 1000,
    },
    {
      id: 'red_old',
      rewardId: 'rew_gaming',
      title: 'Old Treat',
      icon: '🎮',
      cost: 120,
      epic: false,
      redeemedAt: now - REFUND_WINDOW_MS - 60 * 1000,
    },
  ];

  const derived = computeDerivedState(state, now);
  const uiState = {
    tab: 'dashboard',
    dashSort: 'recent',
    attrFilter: 'all',
    activitiesSort: 'level',
    statsTimeframe: 'week',
    historyActivityFilter: 'all',
    sprintPresetMin: 25,
    sprintActivityId: state.activities[0].id,
  };
  const activeTimer = {
    activityId: state.activities[0].id,
    isRunning: true,
    startedAt: now - 420 * 1000,
    accumulatedMs: 0,
    mode: 'sprint',
    targetSeconds: 1500,
    sprintCompleted: false,
    note: 'Smoke test sprint',
  };
  const actMap = new Map(derived.activityStats.map((a) => [a.id, a]));

  assertCleanHtml(
    renderActiveTimerBar(activeTimer, actMap, derived.streak.multiplier, 420, derived.gearBonuses),
    'Active Timer Bar'
  );
  assertCleanHtml(renderDashboardView(state, derived, uiState, activeTimer), 'Dashboard View');
  assertCleanHtml(renderActivitiesView(state, derived, uiState, activeTimer), 'Activities View');
  assertCleanHtml(renderStatsView(state, derived, uiState), 'Time & Stats View');
  assertCleanHtml(renderQuestsAndBadgesView(state, derived), 'Quests & Boss View');

  const shopHtml = renderShopView(state, derived);
  assertCleanHtml(shopHtml, 'Tavern Shop View');
  // Recent redemption has refund button, old redemption (>10m) is locked
  assert.ok(
    shopHtml.includes('data-action="refund-redemption" data-id="red_recent"'),
    'Recent redemption should be refundable'
  );
  assert.ok(
    !shopHtml.includes('data-action="refund-redemption" data-id="red_old"'),
    'Expired redemption (>10m) should not show refund button'
  );
});

test('All LifeQuest modals render cleanly and satisfy security & regression invariants', () => {
  const now = new Date(2026, 10, 27, 15, 0, 0).getTime();
  const state = createSampleAdventureState(now);
  const derived = computeDerivedState(state, now);

  const syncDisconnected = { connected: false, status: 'idle', error: '' };
  const syncConnected = {
    connected: true,
    provider: 'gist',
    username: 'kai-hero',
    gistId: 'gist_demo_123',
    gistUrl: 'https://gist.github.com/kai-hero/gist_demo_123',
    version: 4,
    lastSyncedAt: now - 5000,
    status: 'synced',
    error: '',
  };

  const sampleGear = GEAR_CATALOG[0];
  const modals = [
    ['themes', { type: 'themes' }, syncDisconnected],
    [
      'chest-reveal',
      {
        type: 'chest-reveal',
        payload: {
          chestLabel: 'Level 4 Hero Chest',
          gear: sampleGear,
          rarityMeta: RARITY_META[sampleGear.rarity],
          isDuplicate: false,
          duplicateGold: 0,
        },
      },
      syncDisconnected,
    ],
    ['activity-create', { type: 'activity' }, syncDisconnected],
    ['activity-edit', { type: 'activity', activityId: state.activities[0].id }, syncDisconnected],
    ['log', { type: 'log', activityId: state.activities[0].id }, syncDisconnected],
    ['profile', { type: 'profile' }, syncDisconnected],
    ['custom-quest', { type: 'custom-quest' }, syncDisconnected],
    ['backup', { type: 'backup' }, syncDisconnected],
    [
      'levelup',
      {
        type: 'levelup',
        payload: {
          icon: '⚔️',
          title: 'Hero Level',
          oldLevel: 5,
          newLevel: 6,
          rankTitle: 'Pathfinder',
          subtitle: 'Well done!',
        },
      },
      syncDisconnected,
    ],
    ['reward-create', { type: 'reward' }, syncDisconnected],
    ['reward-edit', { type: 'reward', rewardId: state.rewards[0].id }, syncDisconnected],
    ['sync-disconnected', { type: 'sync' }, syncDisconnected],
    ['sync-connected', { type: 'sync' }, syncConnected],
  ];

  for (const [label, modalState, syncInfo] of modals) {
    const html = renderModal(modalState, state, syncInfo, derived);
    assertCleanHtml(html, `Modal(${label})`);
    assert.ok(html.includes('role="dialog"'), `Modal(${label}) should include role="dialog"`);
    assert.ok(html.includes('aria-modal="true"'), `Modal(${label}) should include aria-modal="true"`);

    if (label === 'chest-reveal') {
      // Prevent regression of the sunburst full-screen bleed & uncentered layout bug
      assert.ok(html.includes('modal-levelup'), 'Chest reveal modal MUST include modal-levelup class');
      assert.ok(html.includes('chest-reveal-modal'), 'Chest reveal modal MUST include chest-reveal-modal class');
    }

    if (label === 'sync-connected' || label === 'sync-disconnected') {
      assert.ok(!html.includes('copy-sync-token'), 'Sync modal must NOT expose raw token clipboard copy action');
      assert.ok(html.includes('gist'), 'Sync modal should guide users to a gist-only token');
    }

    if (label === 'backup') {
      assert.ok(html.includes('enable-notifications'), 'Backup modal should include Sprint Finish Alerts toggle');
    }
  }
});

test('UI rendering escapes untrusted user input against XSS across views', () => {
  const now = Date.now();
  const state = createSampleAdventureState(now);
  const xssPayload = '<img src=x onerror="alert(1)"><script>evil()</script>';
  state.profile.name = xssPayload;
  state.activities[0].name = xssPayload;
  state.rewards[0].title = xssPayload;

  const derived = computeDerivedState(state, now);
  const uiState = {
    tab: 'dashboard',
    dashSort: 'recent',
    attrFilter: 'all',
    activitiesSort: 'level',
    statsTimeframe: 'week',
    historyActivityFilter: 'all',
    sprintPresetMin: 25,
    sprintActivityId: state.activities[0].id,
  };

  const dashHtml = renderDashboardView(state, derived, uiState, null);
  const shopHtml = renderShopView(state, derived);
  assert.ok(!dashHtml.includes('<script>evil()</script>'), 'Dashboard must escape raw <script> tags');
  assert.ok(!dashHtml.includes('onerror="alert(1)"'), 'Dashboard must escape raw HTML attributes');
  assert.ok(!shopHtml.includes('<script>evil()</script>'), 'Shop must escape raw <script> tags');
});
