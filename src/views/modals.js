/**
 * All LifeQuest Modals (Themes, Chest Reveal, Activity, Manual Log, Profile,
 * Custom Quest, Backup, Level-Up, Reward, GitHub Gist Cloud Sync).
 */

import {
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  ATTRIBUTES,
  RARITY_META,
  REWARD_ICONS,
} from '../rpgEngine.js';
import { GITHUB_TOKEN_CREATE_URL } from '../sync.js';
import { PLAYER_AVATARS, esc, formatRelativeTime } from './helpers.js';

export function renderModal(modalState, state, syncInfo = null, derived = null) {
  if (!modalState) return '';

  if (modalState.type === 'themes') {
    const themes = (derived && derived.themes) || [];
    const pocketGold = derived && derived.gold ? derived.gold.pocketBalance : 0;
    const playerLv = derived && derived.playerLevelInfo ? derived.playerLevelInfo.level : 1;

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-lg" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <div>
              <h2 id="modal-title">🎨 RPG Visual Themes &amp; Particle FX</h2>
              <p class="modal-head-sub">Unlock themes automatically as your Hero levels up, or unlock early with Pocket Gold (${pocketGold.toLocaleString()}g).</p>
            </div>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>

          <div class="themes-grid">
            ${themes
              .map((t) => {
                const canBuy = !t.unlocked && pocketGold >= t.cost;
                return `
                  <article class="theme-option-card ${t.active ? 'is-active' : ''} ${t.unlocked ? 'is-unlocked' : 'is-locked'}">
                    <div class="theme-swatch-banner" style="background: linear-gradient(135deg, ${esc(t.swatches[0])} 0%, ${esc(t.swatches[1])} 55%, ${esc(t.swatches[2])} 100%);">
                      <span class="theme-banner-ico">${esc(t.icon)}</span>
                      <span class="theme-particle-chip">✨ ${esc(t.particleLabel)}</span>
                    </div>
                    <div class="theme-option-body">
                      <div class="theme-option-head">
                        <h3>${esc(t.name)}</h3>
                        ${
                          t.active
                            ? `<span class="theme-status-pill is-active">✓ Active</span>`
                            : t.unlocked
                              ? `<span class="theme-status-pill is-ready">Unlocked</span>`
                              : `<span class="theme-status-pill is-locked">Lv.${t.unlockLevel} · ${t.cost}g</span>`
                        }
                      </div>
                      <p class="theme-option-desc">${esc(t.desc)}</p>
                      <div class="theme-option-footer">
                        ${
                          t.active
                            ? `<button type="button" class="btn btn-soft btn-xs flex-grow" disabled>Currently Active</button>`
                            : t.unlocked
                              ? `<button type="button" class="btn btn-primary btn-xs flex-grow" data-action="select-theme" data-theme-id="${esc(t.id)}">✨ Activate Theme</button>`
                              : `<button type="button" class="btn ${canBuy ? 'btn-gold' : 'btn-soft'} btn-xs flex-grow" data-action="buy-theme" data-theme-id="${esc(t.id)}" ${canBuy ? '' : 'disabled'}>
                                  ${canBuy ? `🪙 Unlock Early · ${t.cost}g` : `Lv.${t.unlockLevel} (You: Lv.${playerLv}) · ${t.cost}g`}
                                </button>`
                        }
                      </div>
                    </div>
                  </article>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'chest-reveal') {
    const p = modalState.payload || {};
    const gear = p.gear;
    const rm = p.rarityMeta || RARITY_META.common;
    const remainingChests = derived && derived.pendingChests ? derived.pendingChests.length : 0;
    const isEquippedNow = gear && state.equippedGear && state.equippedGear[gear.slot] === gear.id;

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm modal-levelup chest-reveal-modal rarity-${esc(gear ? gear.rarity : 'common')}" style="--rarity-color: ${esc(rm.color)}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="levelup-rays"></div>
          <div class="chest-source-kicker">${esc(p.chestLabel || 'Loot Chest Opened!')}</div>
          <div class="levelup-badge chest-item-badge">${esc(gear ? gear.icon : '🎁')}</div>
          <span class="rarity-pill rarity-${esc(gear ? gear.rarity : 'common')} chest-rarity-pill">${esc(rm.label)}</span>
          <h2 id="modal-title" class="levelup-heading">${esc(gear ? gear.name : 'Mystery Loot')}</h2>
          <div class="chest-buff-banner">${esc(gear ? gear.bonusText : '')}</div>
          <p class="levelup-sub">${esc(gear ? gear.lore : '')}</p>
          ${
            p.isDuplicate
              ? `<div class="chest-dup-note">✨ Already owned — dismantled duplicate for <strong>+${p.duplicateGold}g 🪙</strong>!</div>`
              : ''
          }
          <div class="chest-reveal-actions">
            ${
              gear && !isEquippedNow
                ? `<button type="button" class="btn btn-gold" data-action="equip-gear" data-gear-id="${esc(gear.id)}" data-close-modal="1">⚔️ Equip Now</button>`
                : ''
            }
            ${
              remainingChests > 0
                ? `<button type="button" class="btn btn-primary" data-action="open-next-chest">🎁 Open Next (${remainingChests})</button>`
                : ''
            }
            <button type="button" class="btn btn-soft" data-action="close-modal">${isEquippedNow || remainingChests === 0 ? 'Awesome! ✨' : 'Keep in Bag'}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'activity') {
    const editing = modalState.activityId
      ? state.activities.find((a) => a.id === modalState.activityId)
      : null;

    const curName = editing ? editing.name : '';
    const curIcon = editing ? editing.icon : ACTIVITY_ICONS[0];
    const curColor = editing ? editing.color : ACTIVITY_COLORS[0];
    const curAttr = editing ? editing.attribute : 'craft';
    const curSecAttr = editing ? editing.secondaryAttribute || '' : '';
    const curGoal = editing ? editing.dailyGoalMinutes || '' : 30;

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">${editing ? 'Edit Activity' : 'Create New Activity'}</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="activity-form" class="modal-form" data-editing-id="${editing ? esc(editing.id) : ''}">
            <div class="form-field">
              <label for="act-name-input">Activity Name</label>
              <input id="act-name-input" name="name" type="text" required maxlength="48" placeholder="e.g., Chess, Guitar Practice, Walk with Friends..." value="${esc(curName)}" autofocus />
            </div>

            <div class="form-field">
              <label>Primary RPG Attribute <span class="label-hint">(100% XP, or 70% if combo selected)</span></label>
              <div class="attr-radio-grid">
                ${ATTRIBUTES.map(
                  (a) => `
                  <label class="attr-radio-card">
                    <input type="radio" name="attribute" value="${a.id}" ${curAttr === a.id ? 'checked' : ''} />
                    <span class="attr-radio-inner" style="--attr-color: ${esc(a.color)}">
                      <span>${esc(a.icon)}</span>
                      <span>${esc(a.label)}</span>
                    </span>
                  </label>
                `
                ).join('')}
              </div>
            </div>

            <div class="form-field">
              <label for="act-sec-attr">Secondary Combo Attribute <span class="label-hint">(optional · splits 30% XP)</span></label>
              <select id="act-sec-attr" name="secondaryAttribute" class="input-select">
                <option value="" ${!curSecAttr ? 'selected' : ''}>None — 100% Primary Attribute</option>
                ${ATTRIBUTES.map(
                  (a) =>
                    `<option value="${a.id}" ${curSecAttr === a.id ? 'selected' : ''}>+ ${esc(a.icon)} ${esc(a.label)} (30% Combo)</option>`
                ).join('')}
              </select>
            </div>

            <div class="form-field">
              <label>Icon</label>
              <div class="icon-picker-grid">
                ${ACTIVITY_ICONS.map(
                  (ic) => `
                  <label class="icon-choice">
                    <input type="radio" name="icon" value="${esc(ic)}" ${curIcon === ic ? 'checked' : ''} />
                    <span>${esc(ic)}</span>
                  </label>
                `
                ).join('')}
              </div>
            </div>

            <div class="form-row-two">
              <div class="form-field">
                <label>Glow Color</label>
                <div class="color-picker-row">
                  ${ACTIVITY_COLORS.map(
                    (c) => `
                    <label class="color-choice">
                      <input type="radio" name="color" value="${esc(c)}" ${curColor === c ? 'checked' : ''} />
                      <span style="background: ${esc(c)}"></span>
                    </label>
                  `
                  ).join('')}
                </div>
              </div>

              <div class="form-field">
                <label for="act-goal-input">Daily Goal (minutes, optional)</label>
                <input id="act-goal-input" name="dailyGoalMinutes" type="number" min="0" max="720" step="5" placeholder="e.g. 30" value="${esc(curGoal)}" />
              </div>
            </div>

            <div class="modal-footer">
              ${
                editing
                  ? `<button type="button" class="btn btn-danger-soft" data-action="delete-activity" data-id="${esc(editing.id)}">Delete</button>`
                  : '<span></span>'
              }
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Activity'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'log') {
    const act = state.activities.find((a) => a.id === modalState.activityId) || state.activities[0];
    if (!act) return '';
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Log Time · ${esc(act.icon)} ${esc(act.name)}</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="manual-log-form" class="modal-form" data-activity-id="${esc(act.id)}">
            <div class="quick-preset-row">
              ${[10, 15, 30, 45, 60, 90]
                .map(
                  (m) =>
                    `<button type="button" class="btn btn-soft btn-xs" data-action="fill-log-minutes" data-minutes="${m}">${m}m</button>`
                )
                .join('')}
            </div>

            <div class="form-row-two">
              <div class="form-field">
                <label for="log-hours">Hours</label>
                <input id="log-hours" name="hours" type="number" min="0" max="16" value="0" />
              </div>
              <div class="form-field">
                <label for="log-minutes">Minutes</label>
                <input id="log-minutes" name="minutes" type="number" min="0" max="59" value="25" autofocus />
              </div>
            </div>

            <div class="form-field">
              <label for="log-note">What did you work on? (optional)</label>
              <input id="log-note" name="note" type="text" maxlength="120" placeholder="e.g., Finished chapter 3, 5k run..." />
            </div>

            <div class="modal-footer">
              <span></span>
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-gold">Log &amp; Claim XP</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'profile') {
    const p = state.profile;
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Customize Hero</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="profile-form" class="modal-form">
            <div class="form-field">
              <label for="hero-name-input">Hero Name</label>
              <input id="hero-name-input" name="name" type="text" required maxlength="32" value="${esc(p.name)}" autofocus />
            </div>
            <div class="form-field">
              <label>Avatar Crest</label>
              <div class="icon-picker-grid avatar-grid">
                ${PLAYER_AVATARS.map(
                  (av) => `
                  <label class="icon-choice">
                    <input type="radio" name="avatar" value="${esc(av)}" ${p.avatar === av ? 'checked' : ''} />
                    <span>${esc(av)}</span>
                  </label>
                `
                ).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <span></span>
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Hero</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'custom-quest') {
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Add Custom Daily Quest</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="custom-quest-form" class="modal-form">
            <div class="form-field">
              <label for="cq-title">Quest Title</label>
              <input id="cq-title" name="title" type="text" required maxlength="64" placeholder="e.g., Tidy my desk, Drink 2L water..." autofocus />
            </div>
            <div class="form-field">
              <label for="cq-xp">Bonus XP Reward</label>
              <select id="cq-xp" name="xpReward" class="input-select">
                <option value="50">Small Quest (+50 XP)</option>
                <option value="100" selected>Medium Quest (+100 XP)</option>
                <option value="175">Boss Quest (+175 XP)</option>
              </select>
            </div>
            <div class="modal-footer">
              <span></span>
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Quest</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'backup') {
    const notifState =
      typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    const notifLabel =
      notifState === 'granted'
        ? '🔔 Sprint Finish Alerts: ON'
        : notifState === 'denied'
          ? '🔕 Sprint Alerts Blocked (Browser)'
          : notifState === 'unsupported'
            ? '🔕 Alerts Not Supported'
            : '🔔 Enable Sprint Finish Alerts';

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Data &amp; Backup</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <div class="backup-panel">
            <p class="text-muted">All your activities, levels, and tracked time are stored privately right in your browser. Export a JSON backup anytime to move devices or keep a safe copy.</p>

            <div class="backup-actions">
              <button class="btn btn-soft" data-action="toggle-fx">
                ${state.settings.fxEnabled !== false ? '✨ Visual Effects: ON' : '✨ Visual Effects: OFF'}
              </button>
              <button class="btn btn-soft" data-action="enable-notifications" ${notifState === 'unsupported' || notifState === 'denied' ? 'disabled' : ''}>
                ${notifLabel}
              </button>
              <button class="btn btn-primary" data-action="export-json">⬇ Download JSON Backup</button>
              <label class="btn btn-soft file-upload-btn">
                ⬆ Import JSON Backup
                <input type="file" id="import-json-input" accept="application/json,.json" hidden />
              </label>
            </div>

            <hr class="modal-divider" />

            <div class="backup-text-block">
              <div class="backup-text-head">
                <strong>Quick Copy / Paste Transfer</strong>
                <button type="button" class="btn btn-soft btn-xs" data-action="fill-backup-text">📋 Load Backup Text</button>
              </div>
              <textarea id="backup-json-box" class="backup-textarea" rows="4" placeholder="Click 'Load Backup Text' to copy, or paste backup JSON here to import..."></textarea>
              <button type="button" class="btn btn-gold btn-sm" data-action="import-backup-text">📥 Import Pasted JSON</button>
            </div>

            <hr class="modal-divider" />

            <div class="backup-secondary">
              <button class="btn btn-soft btn-sm" data-action="load-sample-data">✨ Load Sample Adventure</button>
              <button class="btn btn-danger-soft btn-sm" data-action="reset-all-data">🗑 Reset to Clean Slate</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'levelup') {
    const info = modalState.payload;
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-levelup" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="levelup-rays"></div>
          <div class="levelup-badge">${esc(info.icon)}</div>
          <div class="levelup-kicker">LEVEL UP!</div>
          <h2 id="modal-title" class="levelup-heading">${esc(info.title)}</h2>
          <div class="levelup-levels">
            <span class="lvl-old">Lv.${info.oldLevel}</span>
            <span class="lvl-arrow">→</span>
            <span class="lvl-new">Lv.${info.newLevel}</span>
          </div>
          ${info.rankTitle ? `<div class="levelup-rank">Rank: <strong>${esc(info.rankTitle)}</strong></div>` : ''}
          ${info.subtitle ? `<p class="levelup-sub">${esc(info.subtitle)}</p>` : ''}
          <button class="btn btn-gold" data-action="close-modal">Keep Going! ✨</button>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'reward') {
    const editing = modalState.rewardId
      ? (state.rewards || []).find((r) => r.id === modalState.rewardId)
      : null;

    const curTitle = editing ? editing.title : '';
    const curIcon = editing ? editing.icon : REWARD_ICONS[0];
    const curCost = editing ? editing.cost : 150;
    const curCooldown = editing ? Number(editing.cooldownHours) || 0 : 0;
    const curDesc = editing ? editing.description : '';
    const curEpic = editing ? Boolean(editing.epic) : false;

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">${editing ? 'Edit Tavern Reward' : 'Add Custom Reward'}</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="reward-form" class="modal-form" data-editing-id="${editing ? esc(editing.id) : ''}">
            <div class="form-field">
              <label for="rew-title-input">Reward Name</label>
              <input id="rew-title-input" name="title" type="text" required maxlength="64" placeholder="e.g., Fancy Coffee, New Headphones..." value="${esc(curTitle)}" autofocus />
            </div>

            <div class="form-row-two">
              <div class="form-field">
                <label for="rew-cost-input">Gold Cost 🪙</label>
                <input id="rew-cost-input" name="cost" type="number" required min="10" max="1000000" step="10" value="${esc(curCost)}" />
              </div>
              <div class="form-field">
                <label for="rew-cooldown-input">Cooldown ⏳ <span class="label-hint">(optional)</span></label>
                <select id="rew-cooldown-input" name="cooldownHours" class="input-select">
                  <option value="0" ${curCooldown === 0 ? 'selected' : ''}>No cooldown</option>
                  <option value="12" ${curCooldown === 12 ? 'selected' : ''}>12 hours</option>
                  <option value="24" ${curCooldown === 24 ? 'selected' : ''}>24 hours (1 day)</option>
                  <option value="48" ${curCooldown === 48 ? 'selected' : ''}>48 hours (2 days)</option>
                  <option value="72" ${curCooldown === 72 ? 'selected' : ''}>72 hours (3 days)</option>
                  <option value="168" ${curCooldown === 168 ? 'selected' : ''}>7 days (1 week)</option>
                </select>
              </div>
            </div>

            <div class="form-field">
              <label for="rew-desc-input">Note / Motivation (optional)</label>
              <input id="rew-desc-input" name="description" type="text" maxlength="140" placeholder="Why this reward feels awesome..." value="${esc(curDesc)}" />
            </div>

            <div class="form-field">
              <label>Icon</label>
              <div class="icon-picker-grid reward-icon-grid">
                ${REWARD_ICONS.map(
                  (ic) => `
                  <label class="icon-choice">
                    <input type="radio" name="icon" value="${esc(ic)}" ${curIcon === ic ? 'checked' : ''} />
                    <span>${esc(ic)}</span>
                  </label>
                `
                ).join('')}
              </div>
            </div>

            <label class="checkbox-row">
              <input type="checkbox" name="epic" ${curEpic ? 'checked' : ''} />
              <span>★ Mark as an <strong>Epic Goal</strong> (golden spotlight card)</span>
            </label>

            <div class="modal-footer">
              ${
                editing
                  ? `<button type="button" class="btn btn-danger-soft" data-action="delete-reward" data-id="${esc(editing.id)}">Delete</button>`
                  : '<span></span>'
              }
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-gold">${editing ? 'Save Reward' : 'Add to Shop'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'sync') {
    const info = syncInfo || {
      connected: false,
      username: null,
      gistId: null,
      gistUrl: null,
      status: 'idle',
      error: '',
      lastSyncedAt: 0,
      version: 0,
    };
    const isBusy = info.status === 'syncing';
    const lastSyncText = info.lastSyncedAt ? formatRelativeTime(info.lastSyncedAt) : 'Not synced yet';
    const handleLabel = info.username ? `@${info.username}` : 'GitHub Gist';

    if (info.connected) {
      return `
        <div class="modal-backdrop" data-action="close-modal-backdrop">
          <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-head">
              <h2 id="modal-title">☁️ GitHub Cloud Sync Connected</h2>
              <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
            </div>
            <div class="sync-panel">
              <div class="sync-connected-box">
                <div class="sync-connected-row">
                  <span class="sync-dot is-ok"></span>
                  <strong>GitHub: <code>${esc(handleLabel)}</code></strong>
                  <span class="sync-rev-tag">v${info.version}</span>
                </div>
                <p class="sync-connected-sub">
                  Last synced: <strong>${esc(lastSyncText)}</strong>. Every session, level-up, Gold change, gear drop, and live timer automatically syncs via your private GitHub Gist!
                </p>
                ${
                  info.gistUrl
                    ? `
                  <div class="sync-meta-links">
                    <a class="btn btn-soft btn-xs" href="${esc(info.gistUrl)}" target="_blank" rel="noopener noreferrer">View Private Gist ↗</a>
                    <a class="btn btn-ghost btn-xs" href="${esc(GITHUB_TOKEN_CREATE_URL)}" target="_blank" rel="noopener noreferrer">🔑 New Gist-Only Token ↗</a>
                  </div>
                `
                    : ''
                }
              </div>

              ${info.error ? `<div class="sync-error-banner">⚠️ ${esc(info.error)}</div>` : ''}

              <div class="sync-instructions">
                <strong>To connect your phone securely:</strong>
                <p>For best security, create a dedicated <strong><code>gist</code>-only</strong> token directly on your phone (never reuse a <code>repo</code> token and never paste tokens into chats). Tap <strong>☁️ Sync</strong> on your phone and paste it — your private vault is found automatically!</p>
              </div>

              <div class="backup-actions">
                <button class="btn btn-primary" data-action="sync-now" ${isBusy ? 'disabled' : ''}>
                  ${isBusy ? '⏳ Syncing...' : '🔄 Sync Now'}
                </button>
                <button class="btn btn-danger-soft btn-sm" data-action="sync-logout" ${isBusy ? 'disabled' : ''}>
                  Sign Out on This Device
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">☁️ Free GitHub PC ↔ Phone Sync</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <div class="sync-panel">
            <p class="text-muted" style="margin: 0;">
              Keep your activities, levels, Gold, Boss HP &amp; live timers synced across PC and phone using a <strong>private GitHub Gist</strong> — 100% free forever with zero credit caps!
            </p>

            <div class="sync-steps">
              <div class="sync-step">
                <span class="sync-step-num">1</span>
                <div class="sync-step-body">
                  <div><strong>Create a <code>gist</code>-only GitHub Sync Token</strong> (leave <code>repo</code> unchecked!):</div>
                  <a class="btn btn-soft btn-xs sync-token-link-btn" href="${esc(GITHUB_TOKEN_CREATE_URL)}" target="_blank" rel="noopener noreferrer">
                    🔑 Create Gist-Only Token ↗
                  </a>
                  <span class="sync-step-hint">Only the <code>gist</code> scope is needed — keeping your code repositories completely separate and protected.</span>
                </div>
              </div>
              <div class="sync-step">
                <span class="sync-step-num">2</span>
                <div class="sync-step-body">
                  <strong>Paste it below on PC &amp; Phone</strong>
                  <span class="sync-step-hint">First device creates your private vault; your phone auto-finds and syncs it with any <code>gist</code>-scoped token on the same GitHub account!</span>
                </div>
              </div>
            </div>

            ${info.error ? `<div class="sync-error-banner">⚠️ ${esc(info.error)}</div>` : ''}

            <form id="sync-auth-form" class="modal-form">
              <div class="form-field">
                <label for="sync-token-input">GitHub Sync Token <span class="label-hint">(<code>gist</code> scope only)</span></label>
                <input
                  id="sync-token-input"
                  name="token"
                  type="password"
                  required
                  minlength="10"
                  maxlength="200"
                  placeholder="Paste ghp_... or github_pat_..."
                  autocomplete="off"
                  spellcheck="false"
                  autofocus
                />
              </div>

              <p class="sync-privacy-note">
                🔒 Stored only inside this browser's local storage and only talks directly to GitHub's official API.
              </p>

              <div class="modal-footer">
                <span></span>
                <div class="modal-footer-right">
                  <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                  <button type="submit" class="btn btn-gold" ${isBusy ? 'disabled' : ''}>
                    ${isBusy ? '⏳ Connecting...' : '☁️ Connect & Sync Now'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}
