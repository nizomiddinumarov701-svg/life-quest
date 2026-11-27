/**
 * Daily Quests, Weekly Boss Arena, Hero Armory & Character Sheet views.
 */

import {
  BOSS_DIFFICULTIES,
  GEAR_MAP,
  GEAR_SLOTS,
  RARITY_META,
  formatDurationShort,
} from '../rpgEngine.js';
import { renderAttributeRadarSvg } from '../charts.js';
import { esc } from './helpers.js';

/**
 * Daily Quest Item row.
 */
export function renderQuestRow(q) {
  const canClaim = q.completed && !q.claimed;
  const isCustomUnfinished = !q.auto && !q.completed;
  const goldBonus = Math.round(q.xpReward * 0.3);

  return `
    <div class="quest-item ${q.claimed ? 'is-claimed' : canClaim ? 'is-ready' : ''}">
      <div class="quest-icon">${esc(q.icon)}</div>
      <div class="quest-body">
        <div class="quest-head">
          <span class="quest-title">${esc(q.title)}</span>
          <span class="quest-reward">+${q.xpReward} XP · +${goldBonus}g</span>
        </div>
        <div class="quest-desc">${esc(q.description)}</div>
        ${
          q.auto
            ? `
          <div class="quest-progress-row">
            <div class="quest-bar-track">
              <div class="quest-bar-fill" style="width: ${q.progressPercent}%"></div>
            </div>
            <span class="quest-progress-label">${q.current}/${q.target} ${esc(q.unit)}</span>
          </div>
        `
            : ''
        }
      </div>
      <div class="quest-action">
        ${
          q.claimed
            ? `<span class="quest-done-pill">✓ Claimed</span>`
            : canClaim
              ? `<button class="btn btn-gold btn-xs pulse-glow" data-action="claim-quest" data-id="${esc(q.id)}">Claim</button>`
              : isCustomUnfinished
                ? `<button class="btn btn-soft btn-xs" data-action="complete-custom-quest" data-id="${esc(q.id)}">Complete</button>`
                : `<span class="quest-pct">${q.progressPercent}%</span>`
        }
      </div>
    </div>
  `;
}

/**
 * Weekly Boss Battle Card (compact on Dashboard, expanded on Quests & Boss tab).
 */
export function renderWeeklyBossCard(state, derived, compact = false) {
  const wb = derived.weeklyBoss;
  const b = wb.boss;
  const canClaim = wb.defeated && !wb.claimed;
  const trophies = state.bossTrophies || [];

  return `
    <section class="card ${compact ? 'sidebar-card' : 'stats-card'} boss-card ${wb.defeated ? 'is-defeated' : ''}" style="--boss-accent: ${esc(b.accent)}">
      <div class="card-header-row">
        <div class="boss-title-wrap">
          <span class="boss-avatar-badge">${esc(b.icon)}</span>
          <div>
            <div class="boss-kicker">Weekly Boss · ${wb.daysLeft}d left</div>
            <h3 class="card-title">${esc(b.name)}</h3>
            <p class="card-sub">${esc(b.subtitle)}</p>
          </div>
        </div>
        ${
          compact
            ? `<button class="btn-link-subtle" data-action="switch-tab" data-tab="quests">Arena →</button>`
            : `<span class="boss-diff-pill">${esc(BOSS_DIFFICULTIES[wb.difficulty].label)} Mode</span>`
        }
      </div>

      <div class="boss-hp-block">
        <div class="boss-hp-row">
          <span class="boss-hp-label">${wb.defeated ? '💀 VANQUISHED!' : `❤️ ${wb.remainingHp.toLocaleString()} / ${wb.maxHp.toLocaleString()} HP`}</span>
          <span class="boss-dmg-stat">⚔️ ${wb.damageDealt.toLocaleString()} DMG${wb.critCount > 0 ? ` · 💥 ${wb.critCount} crit${wb.critCount === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div class="boss-hp-track">
          <div class="boss-hp-fill" style="width: ${wb.hpPercent}%"></div>
        </div>
      </div>

      ${
        canClaim
          ? `
        <div class="boss-victory-bar">
          <div>
            <strong>Victory!</strong> Claim your weekly boss bounty:
            <span class="text-gold">+${wb.bountyXp} XP · +${wb.bountyGold}g</span>
          </div>
          <button class="btn btn-gold btn-sm pulse-glow" data-action="claim-boss">🏆 Claim Bounty</button>
        </div>
      `
          : wb.claimed
            ? `
        <div class="boss-claimed-pill">✓ Weekly Boss Defeated &amp; Trophy Earned! Next boss arrives Monday.</div>
      `
            : `
        <div class="boss-tip-row">
          <span>Every minute tracked = <strong>1 DMG</strong> · 30m+ sessions land <strong>💥 Focus Crits!</strong></span>
          <span class="text-gold">Bounty: +${wb.bountyXp} XP · +${wb.bountyGold}g</span>
        </div>
      `
      }

      ${
        !compact
          ? `
        <div class="boss-footer-controls">
          <div class="boss-diff-row">
            <span class="boss-diff-label">Boss Difficulty:</span>
            <div class="segmented-sm" role="group" aria-label="Boss difficulty">
              ${Object.values(BOSS_DIFFICULTIES)
                .map(
                  (d) => `
                <button
                  class="${wb.difficulty === d.id ? 'is-active' : ''}"
                  data-action="set-boss-difficulty"
                  data-value="${d.id}"
                  title="${esc(d.desc)}"
                >${esc(d.label)}</button>
              `
                )
                .join('')}
            </div>
          </div>

          ${
            trophies.length > 0
              ? `
            <div class="trophy-shelf">
              <div class="trophy-shelf-label">🏆 Boss Trophies (${trophies.length})</div>
              <div class="trophy-pills">
                ${trophies
                  .slice(-8)
                  .reverse()
                  .map(
                    (t) =>
                      `<span class="trophy-pill" title="Defeated ${esc(t.bossName)} (${t.maxHp} HP)">${esc(t.bossIcon)} ${esc(t.bossName)}</span>`
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `
          : ''
      }
    </section>
  `;
}

/**
 * Hero Armory & Loot Chests Panel.
 */
function renderHeroArmorySection(state, derived) {
  const gearBonuses = derived.gearBonuses;
  const pendingChests = derived.pendingChests || [];
  const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const ownedItems = (state.inventoryGear || [])
    .map((entry) => GEAR_MAP[entry.gearId])
    .filter(Boolean)
    .sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0) || a.name.localeCompare(b.name));

  const equippedIds = new Set(Object.values(state.equippedGear || {}).filter(Boolean));
  const nextChest = pendingChests[0] || null;

  return `
    <section class="card stats-card armory-card">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">🛡️ Hero Armory &amp; RPG Gear</h3>
          <p class="card-sub">Open Loot Chests from Level-Ups, Boss Raids &amp; Focus Sprints to equip passive XP, Gold &amp; Boss DMG buffs.</p>
        </div>
        ${
          nextChest
            ? `
          <button type="button" class="btn btn-gold btn-sm pulse-glow" data-action="open-next-chest">
            🎁 Open Chest (${pendingChests.length})
          </button>
        `
            : `<button type="button" class="btn btn-soft btn-xs" data-action="switch-tab" data-tab="shop">🧰 Mystery Chests →</button>`
        }
      </div>

      ${
        nextChest
          ? `
        <div class="chest-banner">
          <div class="chest-banner-left">
            <span class="chest-banner-ico">${esc(nextChest.icon)}</span>
            <div>
              <strong>${pendingChests.length} Loot Chest${pendingChests.length === 1 ? '' : 's'} Waiting!</strong>
              <div class="chest-banner-sub">Next up: <strong>${esc(nextChest.label)}</strong> · ${esc(nextChest.source)}</div>
            </div>
          </div>
          <button type="button" class="btn btn-gold btn-sm" data-action="open-next-chest">✨ Open Now</button>
        </div>
      `
          : ''
      }

      <div class="gear-slots-grid">
        ${GEAR_SLOTS.map((slot) => {
          const item = gearBonuses.equippedItems[slot.id];
          const rm = item ? RARITY_META[item.rarity] : null;
          return `
            <div class="gear-slot-card ${item ? `is-filled rarity-${esc(item.rarity)}` : 'is-empty'}" ${rm ? `style="--rarity-color: ${esc(rm.color)}"` : ''}>
              <div class="gear-slot-head">
                <span class="gear-slot-label">${esc(slot.icon)} ${esc(slot.label)}</span>
                ${
                  item
                    ? `<span class="rarity-pill rarity-${esc(item.rarity)}">${esc(rm.label)}</span>`
                    : `<span class="gear-empty-tag">Empty</span>`
                }
              </div>
              ${
                item
                  ? `
                <div class="gear-slot-item">
                  <span class="gear-item-ico">${esc(item.icon)}</span>
                  <div class="gear-item-copy">
                    <div class="gear-item-name">${esc(item.name)}</div>
                    <div class="gear-item-buff">${esc(item.bonusText)}</div>
                  </div>
                </div>
                <button type="button" class="btn btn-ghost btn-xs gear-unequip-btn" data-action="unequip-gear" data-slot="${esc(slot.id)}">Unequip</button>
              `
                  : `<div class="gear-empty-hint">Open chests to find a ${esc(slot.label.toLowerCase())}!</div>`
              }
            </div>
          `;
        }).join('')}
      </div>

      ${
        gearBonuses.summaryTags.length > 0
          ? `
        <div class="active-buffs-bar">
          <span class="active-buffs-label">⚡ Active Gear Buffs:</span>
          ${gearBonuses.summaryTags.map((t) => `<span class="buff-pill">${esc(t)}</span>`).join('')}
        </div>
      `
          : ''
      }

      <div class="inventory-section">
        <div class="inventory-head">
          <strong>🎒 Collected Gear (${ownedItems.length} / 16)</strong>
          <span class="text-muted">Click any item to equip or swap</span>
        </div>
        ${
          ownedItems.length === 0
            ? `<div class="empty-inline"><p>No gear collected yet — ${nextChest ? 'click <strong>Open Chest</strong> above to claim your first drops!' : 'level up, finish 3 Focus Sprints, or slay a Weekly Boss to earn Loot Chests!'}</p></div>`
            : `
          <div class="inventory-grid">
            ${ownedItems
              .map((item) => {
                const rm = RARITY_META[item.rarity] || RARITY_META.common;
                const isEquipped = equippedIds.has(item.id);
                return `
                  <button
                    type="button"
                    class="inv-item-card rarity-${esc(item.rarity)} ${isEquipped ? 'is-equipped' : ''}"
                    style="--rarity-color: ${esc(rm.color)}"
                    data-action="${isEquipped ? 'unequip-gear' : 'equip-gear'}"
                    data-gear-id="${esc(item.id)}"
                    data-slot="${esc(item.slot)}"
                    title="${esc(item.lore)}"
                  >
                    <span class="inv-item-ico">${esc(item.icon)}</span>
                    <div class="inv-item-info">
                      <div class="inv-item-title">${esc(item.name)}</div>
                      <div class="inv-item-meta">${esc(item.bonusText)}</div>
                    </div>
                    <span class="inv-state-tag">${isEquipped ? '✓ Equipped' : 'Equip'}</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        `
        }
      </div>
    </section>
  `;
}

/**
 * TAB 4: QUESTS, BOSS ARENA, HERO ARMORY & ACHIEVEMENTS VIEW
 */
export function renderQuestsAndBadgesView(state, derived) {
  const unlockedCount = derived.achievements.filter((a) => a.unlocked).length;
  const sortedAchievements = [...derived.achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const hc = derived.heroClass;

  return `
    <div class="page-head-row">
      <div>
        <h1 class="page-title">Quests, Boss Arena &amp; Character Sheet</h1>
        <p class="page-sub">Slay weekly bosses, open Loot Chests, equip RPG gear, and evolve your Hero Class.</p>
      </div>
      <button class="btn btn-primary" data-action="open-custom-quest">+ Add Custom Quest</button>
    </div>

    ${renderWeeklyBossCard(state, derived, false)}

    ${renderHeroArmorySection(state, derived)}

    <div class="stats-grid-two">
      <section class="card stats-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">📜 Today’s Daily Quests</h3>
            <p class="card-sub">Progress updates automatically as you log time</p>
          </div>
          <span class="streak-pill-inline">🔥 ${derived.streak.current}d · ${derived.streak.multiplier.toFixed(1)}x XP</span>
        </div>
        <div class="quest-list">
          ${derived.dailyQuests.map(renderQuestRow).join('')}
        </div>
        <div class="streak-info-box">
          <strong>Streak Multiplier:</strong> Every consecutive day you log an action adds <strong>+10% XP &amp; Gold</strong> (up to <strong>2.0x</strong> at 11+ days).
        </div>
      </section>

      <section class="card stats-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">🧭 Hero Class &amp; RPG Attributes</h3>
            <p class="card-sub">Your Hero Class evolves automatically from your strongest attributes</p>
          </div>
        </div>

        <div class="hero-class-banner" style="--class-color: ${esc(hc.accentColor)}">
          <div class="hero-class-icon">${esc(hc.icon)}</div>
          <div class="hero-class-copy">
            <div class="hero-class-kicker">Current Hero Class</div>
            <div class="hero-class-name">${esc(hc.name)}</div>
            <div class="hero-class-desc">${esc(hc.desc)}</div>
          </div>
        </div>

        <div class="radar-detail-layout">
          <div class="radar-wrap">
            ${renderAttributeRadarSvg(derived.attributeStats, 'quests')}
          </div>
          <div class="attr-detail-list">
            ${derived.attributeStats
              .map(
                (attr) => `
              <div class="attr-detail-row" style="--attr-color: ${esc(attr.color)}">
                <div class="attr-detail-head">
                  <span><strong>${esc(attr.icon)} ${esc(attr.label)}</strong> · Lv.${attr.levelInfo.level}</span>
                  <span class="text-muted">${formatDurationShort(attr.totalSeconds)}</span>
                </div>
                <div class="attr-detail-desc">${esc(attr.desc)}</div>
                <div class="xp-bar-track attr-xp-track">
                  <div class="xp-bar-fill" style="width: ${attr.levelInfo.progressPercent}%; background: ${esc(attr.color)}"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>
    </div>

    <section class="card stats-card">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">🏅 Achievements &amp; Badges</h3>
          <p class="card-sub">${unlockedCount} of ${derived.achievements.length} unlocked — each grants bonus Player XP &amp; Gold!</p>
        </div>
      </div>

      <div class="achievements-grid">
        ${sortedAchievements
          .map(
            (ach) => `
          <div class="achievement-card ${ach.unlocked ? 'is-unlocked' : 'is-locked'}">
            <div class="ach-icon">${esc(ach.icon)}</div>
            <div class="ach-body">
              <div class="ach-head">
                <h4 class="ach-title">${esc(ach.title)}</h4>
                <span class="ach-xp">+${ach.xpReward} XP · +${Math.round(ach.xpReward * 0.3)}g</span>
              </div>
              <p class="ach-desc">${esc(ach.description)}</p>
              ${
                ach.unlocked
                  ? `<div class="ach-unlocked-tag">✓ Unlocked</div>`
                  : `
                <div class="quest-progress-row">
                  <div class="quest-bar-track">
                    <div class="quest-bar-fill" style="width: ${ach.progressPercent}%"></div>
                  </div>
                  <span class="quest-progress-label">${ach.current}/${ach.target} ${esc(ach.unit)}</span>
                </div>
              `
              }
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}
