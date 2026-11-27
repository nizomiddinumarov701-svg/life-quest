/**
 * LifeQuest RPG Expansion Views:
 * 1. Blacksmith Forge (Upgrade & Craft Gear)
 * 2. Cozy Companion Pet (Hero Chip, Sanctuary Card & Modal)
 * 3. Story Campaigns (Multi-Chapter Epic Quests, Trophies & Modal)
 */

import {
  ACTIVITY_COLORS,
  CAMPAIGN_CHAPTER_GOLD,
  CAMPAIGN_CHAPTER_SHARDS,
  CAMPAIGN_CHAPTER_XP,
  CAMPAIGN_ICONS,
  CAMPAIGN_MIN_CHAPTERS_FOR_CHEST,
  CAMPAIGN_TEMPLATES,
  COMPANION_CATALOG,
  COMPANION_STAGES,
  FORGE_CRAFT_COSTS,
  FORGE_MAX_LEVEL,
  FORGE_UPGRADE_TIERS,
  GEAR_CATALOG,
  GEAR_MAP,
  GEAR_SLOTS,
  RARITY_META,
  getScaledGearItem,
} from '../rpgEngine.js';
import { esc } from './helpers.js';

/**
 * Compact Companion Pet pill inside the Dashboard Hero Banner.
 */
export function renderCompanionHeroChip(companion) {
  if (!companion || !companion.adopted) {
    return `
      <button type="button" class="hero-companion-chip is-egg" data-action="open-companion-modal" title="Adopt a cozy RPG companion pet!">
        <span class="companion-chip-ico">🥚</span>
        <span>Adopt Companion</span>
      </button>
    `;
  }

  return `
    <button
      type="button"
      class="hero-companion-chip is-adopted mood-${esc(companion.mood)}"
      style="--pet-color: ${esc(companion.def.color)}"
      data-action="open-companion-modal"
      title="${esc(companion.name)} (${esc(companion.stageTitle)}) · ${esc(companion.bonusText)} — ${esc(companion.moodQuote)}"
    >
      <span class="companion-chip-ico">${esc(companion.stageIcon)}</span>
      <span class="companion-chip-name">${esc(companion.name)}</span>
      <span class="companion-chip-perk">${esc(companion.bonusText)}</span>
    </button>
  `;
}

/**
 * Cozy Companion Sanctuary card inside Quests & Character Sheet.
 */
export function renderCompanionSanctuaryCard(state, derived) {
  const pet = derived.companion;

  if (!pet || !pet.adopted) {
    return `
      <section class="card stats-card companion-card is-unadopted">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">🥚 Cozy Companion Sanctuary</h3>
            <p class="card-sub">Adopt an RPG companion that evolves through 4 stages as your streak &amp; hours grow — with a cozy passive perk!</p>
          </div>
        </div>
        <div class="companion-starter-grid">
          ${COMPANION_CATALOG.map(
            (c) => `
            <button
              type="button"
              class="companion-starter-card"
              style="--pet-color: ${esc(c.color)}"
              data-action="adopt-companion"
              data-species="${esc(c.id)}"
            >
              <span class="companion-starter-ico">${esc(c.stageIcons[0])}</span>
              <div class="companion-starter-info">
                <strong>${esc(c.speciesName)}</strong>
                <span class="companion-perk-pill">+${c.stageValues[0]}% → +${c.stageValues[3]}% ${esc(c.perkLabel)}</span>
                <p>${esc(c.desc)}</p>
              </div>
              <span class="btn btn-soft btn-xs">Adopt</span>
            </button>
          `
          ).join('')}
        </div>
      </section>
    `;
  }

  const nextHint = pet.nextStage
    ? `Next: <strong>${esc(pet.def.stageTitles[pet.stageIndex + 1])}</strong> at ${pet.nextStage.minHours}h total (${pet.totalHours}h) or ${pet.nextStage.minStreak}d streak (${pet.bestStreak}d)`
    : `✨ Max Evolution Reached — <strong>${esc(pet.stageTitle)}</strong>!`;

  return `
    <section class="card stats-card companion-card" style="--pet-color: ${esc(pet.def.color)}">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">${esc(pet.stageIcon)} Companion Sanctuary</h3>
          <p class="card-sub">Evolves automatically from your lifetime hours &amp; best streak — never loses progress.</p>
        </div>
        <div class="companion-card-actions">
          <button type="button" class="btn btn-soft btn-xs" data-action="pet-companion">💛 Pet (${pet.petsCount})</button>
          <button type="button" class="btn btn-ghost btn-xs" data-action="open-companion-modal">Customize</button>
        </div>
      </div>

      <div class="companion-showcase">
        <button type="button" class="companion-avatar-orb mood-${esc(pet.mood)}" data-action="pet-companion" title="Click to pet ${esc(pet.name)}!">
          <span class="companion-orb-emoji">${esc(pet.stageIcon)}</span>
          <span class="companion-stage-pill">Stage ${pet.stage}/4</span>
        </button>

        <div class="companion-details">
          <div class="companion-name-row">
            <strong>${esc(pet.name)}</strong>
            <span class="companion-species-tag">${esc(pet.stageTitle)}</span>
            <span class="companion-mood-tag">${esc(pet.moodBadge)}</span>
            <span class="buff-pill">${esc(pet.bonusText)}</span>
          </div>
          <p class="companion-quote">“${esc(pet.moodQuote)}”</p>

          <div class="companion-evo-wrap">
            <div class="companion-evo-head">
              <span>${nextHint}</span>
              <span><strong>${pet.progressPercent}%</strong></span>
            </div>
            <div class="xp-bar-track companion-evo-track">
              <div class="xp-bar-fill companion-evo-fill" style="width: ${pet.progressPercent}%"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Story Campaigns board inside Quests & Character Sheet.
 */
export function renderStoryCampaignsSection(state, derived) {
  const summary = derived.campaigns || { items: [], active: [], completed: [], claimableCount: 0 };
  const actMap = new Map((state.activities || []).map((a) => [a.id, a]));

  return `
    <section class="card stats-card campaigns-card">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">📜 Story Campaigns (Epic Projects)</h3>
          <p class="card-sub">Break big real-life goals into chapters. Each chapter pays <strong>+${CAMPAIGN_CHAPTER_XP} XP · +${CAMPAIGN_CHAPTER_GOLD}g · +${CAMPAIGN_CHAPTER_SHARDS} 💠</strong>, and finishing 3+ chapter arcs drops a guaranteed <strong>👑 Epic+ Chest</strong>!</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" data-action="open-new-campaign">+ New Campaign</button>
      </div>

      ${
        summary.active.length === 0
          ? `
        <div class="empty-inline campaign-empty">
          <p>No active Story Campaigns yet — create one for a big goal like a certification, coding project, book, or fitness arc!</p>
          <div class="campaign-quick-templates">
            ${CAMPAIGN_TEMPLATES.map(
              (tpl) => `
              <button type="button" class="btn btn-soft btn-xs" data-action="open-new-campaign" data-template="${esc(tpl.id)}">${esc(tpl.label)}</button>
            `
            ).join('')}
          </div>
        </div>
      `
          : `
        <div class="campaigns-grid">
          ${summary.active
            .map((camp) => {
              const linkedAct = camp.linkedActivityId ? actMap.get(camp.linkedActivityId) : null;
              return `
                <article class="campaign-item-card ${camp.canClaimVictory ? 'is-victory-ready' : ''}" style="--camp-color: ${esc(camp.color)}">
                  <div class="campaign-item-head">
                    <div class="campaign-item-title-wrap">
                      <span class="campaign-item-ico">${esc(camp.icon)}</span>
                      <div>
                        <h4 class="campaign-item-title">${esc(camp.title)}</h4>
                        <div class="campaign-item-meta">
                          <span>${camp.completedCount} / ${camp.totalCount} chapters (${camp.progressPercent}%)</span>
                          ${linkedAct ? `<span class="campaign-skill-tag">${esc(linkedAct.icon)} ${esc(linkedAct.name)}</span>` : ''}
                        </div>
                      </div>
                    </div>
                    <div class="campaign-item-tools">
                      <button type="button" class="btn btn-ghost btn-xs btn-icon-only" data-action="open-edit-campaign" data-id="${esc(camp.id)}" title="Edit campaign" aria-label="Edit ${esc(camp.title)}">✎</button>
                      <button type="button" class="btn btn-ghost btn-xs btn-icon-only" data-action="delete-campaign" data-id="${esc(camp.id)}" title="Delete campaign" aria-label="Delete ${esc(camp.title)}">✕</button>
                    </div>
                  </div>

                  ${camp.description ? `<p class="campaign-item-desc">${esc(camp.description)}</p>` : ''}

                  <div class="xp-bar-track campaign-progress-track">
                    <div class="xp-bar-fill campaign-progress-fill" style="width: ${camp.progressPercent}%"></div>
                  </div>

                  <div class="campaign-chapters-list">
                    ${camp.chapters
                      .map(
                        (ch, idx) => `
                      <button
                        type="button"
                        class="campaign-chapter-row ${ch.completed ? 'is-done' : ''}"
                        data-action="toggle-campaign-chapter"
                        data-campaign-id="${esc(camp.id)}"
                        data-chapter-id="${esc(ch.id)}"
                      >
                        <span class="chapter-check-box" aria-hidden="true">${ch.completed ? '✓' : idx + 1}</span>
                        <span class="chapter-title">${esc(ch.title)}</span>
                        <span class="chapter-reward-tag">${ch.completed ? 'Done' : `+${CAMPAIGN_CHAPTER_XP} XP`}</span>
                      </button>
                    `
                      )
                      .join('')}
                  </div>

                  ${
                    camp.canClaimVictory
                      ? `
                    <div class="campaign-victory-bar">
                      <div>
                        <strong>🎉 All Chapters Complete!</strong>
                        <div class="campaign-victory-sub">
                          +${camp.victoryXp} XP · +${camp.victoryGold}g · +${camp.victoryShards} 💠${camp.earnsEpicChest ? ' · 👑 Epic+ Chest' : ''}
                        </div>
                      </div>
                      <button type="button" class="btn btn-gold btn-sm pulse-glow" data-action="claim-campaign-victory" data-id="${esc(camp.id)}">🏆 Claim Victory</button>
                    </div>
                  `
                      : `
                    <div class="campaign-footer-hint">
                      <span>Completion Bounty: <strong>+${camp.victoryXp} XP · +${camp.victoryGold}g · +${camp.victoryShards} 💠${camp.earnsEpicChest ? ' · 👑 Epic+ Chest' : ''}</strong></span>
                    </div>
                  `
                  }
                </article>
              `;
            })
            .join('')}
        </div>
      `
      }

      ${
        summary.completed.length > 0
          ? `
        <div class="campaign-trophies-shelf">
          <div class="trophies-label">🏆 Completed Campaign Trophies (${summary.completed.length})</div>
          <div class="trophies-row">
            ${summary.completed
              .map(
                (c) => `
              <span class="trophy-pill campaign-trophy-pill" title="Completed ${c.totalCount} chapters">
                ${esc(c.icon)} ${esc(c.title)} ✓
                <button type="button" class="trophy-del-btn" data-action="delete-campaign" data-id="${esc(c.id)}" title="Remove trophy" aria-label="Remove ${esc(c.title)}">×</button>
              </span>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    </section>
  `;
}

/**
 * Blacksmith Forge Modal (Upgrade owned gear + Craft missing gear).
 */
export function renderForgeModal(state, derived, modalState) {
  const forge = derived.forge || { balance: 0, totalEarned: 0, totalSpent: 0 };
  const pocketGold = derived.gold ? derived.gold.pocketBalance : 0;
  const ownedMap = new Map((state.inventoryGear || []).map((e) => [e.gearId, e]));
  const gearUpgrades = state.gearUpgrades || {};
  const equippedIds = new Set(Object.values(state.equippedGear || {}).filter(Boolean));
  const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };

  const ownedItems = (state.inventoryGear || [])
    .map((entry) => {
      const base = GEAR_MAP[entry.gearId];
      if (!base) return null;
      const lv = Number(gearUpgrades[base.id]) || 0;
      return {
        base,
        current: getScaledGearItem(base, lv),
        next: lv < FORGE_MAX_LEVEL ? getScaledGearItem(base, lv + 1) : null,
        nextTier: lv < FORGE_MAX_LEVEL ? FORGE_UPGRADE_TIERS[lv + 1] : null,
        equipped: equippedIds.has(base.id),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.equipped) - Number(a.equipped) || (rarityOrder[b.base.rarity] || 0) - (rarityOrder[a.base.rarity] || 0));

  const unownedItems = GEAR_CATALOG.filter((g) => !ownedMap.has(g.id)).sort(
    (a, b) => (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0) || a.name.localeCompare(b.name)
  );

  const activeTab = modalState.tab || (ownedItems.length > 0 ? 'upgrade' : 'craft');

  return `
    <div class="modal-backdrop" data-action="close-modal-backdrop">
      <div class="modal-card modal-lg forge-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <div>
            <h2 id="modal-title">🔨 Blacksmith Forge</h2>
            <p class="modal-head-sub">Temper owned gear up to <strong>+3 Masterwork ★</strong> or craft missing items directly.</p>
          </div>
          <button type="button" class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
        </div>

        <div class="modal-body">
          <div class="forge-wallet-bar">
            <div class="forge-currency-pill is-shards">
              <span>💠 Forge Shards</span>
              <strong>${forge.balance.toLocaleString()}</strong>
            </div>
            <div class="forge-currency-pill is-gold">
              <span>🪙 Pocket Gold</span>
              <strong>${pocketGold.toLocaleString()}g</strong>
            </div>
            <div class="forge-earn-hint">
              Earn Shards from <strong>Hero Levels (+3 every 2 lv)</strong>, <strong>Boss Kills (+6)</strong>, <strong>Duplicate Drops</strong> &amp; <strong>Story Campaigns</strong>.
            </div>
          </div>

          <div class="forge-tabs" role="tablist">
            <button
              type="button"
              class="mode-chip ${activeTab === 'upgrade' ? 'is-active' : ''}"
              data-action="set-forge-tab"
              data-tab="upgrade"
              role="tab"
              aria-selected="${activeTab === 'upgrade'}"
            >
              ⚒️ Upgrade Owned (${ownedItems.length})
            </button>
            <button
              type="button"
              class="mode-chip ${activeTab === 'craft' ? 'is-active' : ''}"
              data-action="set-forge-tab"
              data-tab="craft"
              role="tab"
              aria-selected="${activeTab === 'craft'}"
            >
              ✨ Craft Missing (${unownedItems.length})
            </button>
          </div>

          ${
            activeTab === 'upgrade'
              ? ownedItems.length === 0
                ? `<div class="empty-inline"><p>You don't own any gear to upgrade yet — open a Loot Chest or switch to <strong>Craft Missing</strong>!</p></div>`
                : `
              <div class="forge-list">
                ${ownedItems
                  .map(({ base, current, next, nextTier, equipped }) => {
                    const rm = RARITY_META[base.rarity] || RARITY_META.common;
                    const isMax = !nextTier;
                    const canAfford = !isMax && forge.balance >= nextTier.shards && pocketGold >= nextTier.gold;
                    return `
                      <div class="forge-row rarity-${esc(base.rarity)} ${current.isMasterwork ? 'is-masterwork' : ''}" style="--rarity-color: ${esc(rm.color)}">
                        <div class="forge-row-left">
                          <span class="forge-item-ico">${esc(base.icon)}</span>
                          <div class="forge-item-copy">
                            <div class="forge-item-name-line">
                              <strong>${esc(current.displayName)}</strong>
                              <span class="rarity-pill rarity-${esc(base.rarity)}">${esc(rm.label)}</span>
                              ${equipped ? `<span class="forge-equipped-tag">Equipped</span>` : ''}
                            </div>
                            <div class="forge-stat-preview">
                              <span>${esc(current.bonusText)}</span>
                              ${
                                next
                                  ? `<span class="forge-stat-arrow">→</span><strong class="forge-stat-next">${esc(next.bonusText)}</strong>`
                                  : `<span class="forge-max-tag">★ Max Masterwork</span>`
                              }
                            </div>
                          </div>
                        </div>
                        <div class="forge-row-action">
                          ${
                            isMax
                              ? `<span class="forge-done-pill">★ Masterwork</span>`
                              : `
                            <button
                              type="button"
                              class="btn ${canAfford ? 'btn-gold' : 'btn-soft'} btn-sm"
                              data-action="forge-upgrade-gear"
                              data-gear-id="${esc(base.id)}"
                              ${canAfford ? '' : 'disabled'}
                            >
                              🔨 ${esc(nextTier.shortTag)} · ${nextTier.shards}💠 + ${nextTier.gold}g
                            </button>
                          `
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `
              : unownedItems.length === 0
                ? `<div class="empty-inline"><p>🏆 Incredible! You own all 16/16 Hero Armory items! Temper them to Masterwork ★ in Upgrade Owned.</p></div>`
                : `
              <div class="forge-list">
                ${unownedItems
                  .map((item) => {
                    const rm = RARITY_META[item.rarity] || RARITY_META.common;
                    const cost = FORGE_CRAFT_COSTS[item.rarity] || FORGE_CRAFT_COSTS.rare;
                    const slotObj = GEAR_SLOTS.find((s) => s.id === item.slot);
                    const canAfford = forge.balance >= cost.shards && pocketGold >= cost.gold;
                    return `
                      <div class="forge-row rarity-${esc(item.rarity)}" style="--rarity-color: ${esc(rm.color)}">
                        <div class="forge-row-left">
                          <span class="forge-item-ico">${esc(item.icon)}</span>
                          <div class="forge-item-copy">
                            <div class="forge-item-name-line">
                              <strong>${esc(item.name)}</strong>
                              <span class="rarity-pill rarity-${esc(item.rarity)}">${esc(rm.label)}</span>
                              ${slotObj ? `<span class="forge-slot-tag">${esc(slotObj.icon)} ${esc(slotObj.label)}</span>` : ''}
                            </div>
                            <div class="forge-stat-preview">
                              <strong>${esc(item.bonusText)}</strong>
                              <span class="text-muted">· ${esc(item.lore)}</span>
                            </div>
                          </div>
                        </div>
                        <div class="forge-row-action">
                          <button
                            type="button"
                            class="btn ${canAfford ? 'btn-primary' : 'btn-soft'} btn-sm"
                            data-action="forge-craft-gear"
                            data-gear-id="${esc(item.id)}"
                            ${canAfford ? '' : 'disabled'}
                          >
                            ✨ Craft · ${cost.shards}💠 + ${cost.gold.toLocaleString()}g
                          </button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * Cozy Companion Sanctuary Modal (Adopt, Switch, Rename, Pet & Evolution Roadmap).
 */
export function renderCompanionModal(state, derived) {
  const pet = derived.companion;
  const currentSpecies = pet && pet.adopted ? pet.species : 'fox';
  const currentName = pet && pet.adopted ? pet.name : '';

  return `
    <div class="modal-backdrop" data-action="close-modal-backdrop">
      <div class="modal-card modal-lg" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <div>
            <h2 id="modal-title">🐉 Cozy Companion Sanctuary</h2>
            <p class="modal-head-sub">Your companion evolves automatically from your total hours &amp; best streak and cheers you on every session.</p>
          </div>
          <button type="button" class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
        </div>

        <form id="companion-form" class="modal-form">
          ${
            pet && pet.adopted
              ? `
            <div class="companion-modal-banner" style="--pet-color: ${esc(pet.def.color)}">
              <div class="companion-modal-orb">${esc(pet.stageIcon)}</div>
              <div class="companion-modal-summary">
                <div class="companion-name-row">
                  <strong>${esc(pet.name)}</strong>
                  <span class="companion-species-tag">${esc(pet.stageTitle)} (Stage ${pet.stage}/4)</span>
                  <span class="buff-pill">${esc(pet.bonusText)}</span>
                </div>
                <p class="companion-quote">“${esc(pet.moodQuote)}”</p>
              </div>
              <button type="button" class="btn btn-gold btn-sm" data-action="pet-companion">💛 Pet (${pet.petsCount})</button>
            </div>
          `
              : ''
          }

          <div class="form-field">
            <span>Choose Companion Species</span>
            <div class="companion-picker-grid">
              ${COMPANION_CATALOG.map((c) => {
                const isSelected = currentSpecies === c.id;
                const stageIdx = pet && pet.adopted ? pet.stageIndex : 0;
                const activeVal = c.stageValues[stageIdx] || c.stageValues[0];
                return `
                  <label class="companion-option-card ${isSelected ? 'is-selected' : ''}" style="--pet-color: ${esc(c.color)}">
                    <input type="radio" name="species" value="${esc(c.id)}" ${isSelected ? 'checked' : ''} />
                    <div class="companion-option-top">
                      <span class="companion-option-ico">${esc(c.stageIcons[stageIdx])}</span>
                      <div>
                        <strong>${esc(c.speciesName)}</strong>
                        <div class="companion-perk-pill">+${activeVal}% ${esc(c.perkLabel)}</div>
                      </div>
                    </div>
                    <p class="companion-option-desc">${esc(c.desc)}</p>
                    <div class="companion-evo-chain">
                      ${c.stageIcons.map((ico, i) => `<span title="Stage ${i + 1}: ${esc(c.stageTitles[i])} (+${c.stageValues[i]}%)">${esc(ico)}</span>`).join('<span class="evo-arrow">→</span>')}
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <label class="form-field">
            <span>Companion Nickname</span>
            <input
              type="text"
              name="name"
              maxlength="24"
              value="${esc(currentName)}"
              placeholder="Leave blank for default (Ember, Pip, Cinder, Mochi)"
            />
          </label>

          <div class="companion-stages-strip">
            ${COMPANION_STAGES.map((st, idx) => {
              const reached = pet && pet.adopted ? pet.stageIndex >= idx : idx === 0;
              return `
                <div class="stage-milestone-pill ${reached ? 'is-reached' : ''}">
                  <strong>Stage ${st.stage} · ${esc(st.label)}</strong>
                  <span>${idx === 0 ? 'Starter' : `${st.minHours}h total or ${st.minStreak}d streak`}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="modal-footer">
            <span></span>
            <div class="modal-footer-right">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">${pet && pet.adopted ? 'Save Companion' : '🥚 Adopt Companion'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Create / Edit Story Campaign Modal.
 */
export function renderCampaignModal(state, modalState) {
  const editing = modalState.campaignId
    ? (state.campaigns || []).find((c) => c.id === modalState.campaignId)
    : null;
  const tpl = !editing && modalState.templateId
    ? CAMPAIGN_TEMPLATES.find((t) => t.id === modalState.templateId)
    : null;

  const title = editing ? editing.title : tpl ? tpl.title : '';
  const icon = editing ? editing.icon : tpl ? tpl.icon : '📜';
  const color = editing ? editing.color : tpl ? tpl.color : '#818cf8';
  const description = editing ? editing.description : tpl ? tpl.description : '';
  const linkedActivityId = editing ? editing.linkedActivityId || '' : '';
  const chaptersText = editing
    ? (editing.chapters || []).map((ch) => ch.title).join('\n')
    : tpl
      ? tpl.chapters.join('\n')
      : '';

  return `
    <div class="modal-backdrop" data-action="close-modal-backdrop">
      <div class="modal-card modal-lg" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <div>
            <h2 id="modal-title">${editing ? 'Edit Story Campaign' : '📜 Create Story Campaign'}</h2>
            <p class="modal-head-sub">Add 3+ chapters to unlock a guaranteed <strong>👑 Epic+ Loot Chest</strong> upon completion!</p>
          </div>
          <button type="button" class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
        </div>

        <form id="campaign-form" class="modal-form" data-editing-id="${editing ? esc(editing.id) : ''}">
          ${
            !editing
              ? `
            <div class="form-field">
              <span>Quick-Start Templates (Optional)</span>
              <div class="campaign-quick-templates">
                ${CAMPAIGN_TEMPLATES.map(
                  (t) => `
                  <button
                    type="button"
                    class="mode-chip ${tpl && tpl.id === t.id ? 'is-active' : ''}"
                    data-action="apply-campaign-template"
                    data-template="${esc(t.id)}"
                  >${esc(t.label)}</button>
                `
                ).join('')}
              </div>
            </div>
          `
              : ''
          }

          <div class="form-row-two">
            <label class="form-field">
              <span>Campaign Title</span>
              <input type="text" name="title" required maxlength="64" autofocus value="${esc(title)}" placeholder="e.g. Pass ISO 27001 Exam" />
            </label>

            <label class="form-field">
              <span>Linked Skill (Optional)</span>
              <select name="linkedActivityId" class="input-select">
                <option value="">None (Standalone Saga)</option>
                ${(state.activities || [])
                  .map(
                    (a) =>
                      `<option value="${esc(a.id)}" ${linkedActivityId === a.id ? 'selected' : ''}>${esc(a.icon)} ${esc(a.name)}</option>`
                  )
                  .join('')}
              </select>
            </label>
          </div>

          <label class="form-field">
            <span>Quest Lore / Goal Summary (Optional)</span>
            <input type="text" name="description" maxlength="140" value="${esc(description)}" placeholder="Why does this epic goal matter to you?" />
          </label>

          <label class="form-field">
            <span>Chapters / Milestones (one per line, 2–12 chapters)</span>
            <textarea
              name="chapters"
              rows="5"
              required
              placeholder="Chapter 1: Setup & notes&#10;Chapter 2: Hands-on practice&#10;Chapter 3: Review & final milestone"
            >${esc(chaptersText)}</textarea>
            <span class="field-hint">Each chapter awards +${CAMPAIGN_CHAPTER_XP} XP, +${CAMPAIGN_CHAPTER_GOLD}g &amp; +${CAMPAIGN_CHAPTER_SHARDS} 💠. Completing ${CAMPAIGN_MIN_CHAPTERS_FOR_CHEST}+ chapters awards a guaranteed Epic+ Chest!</span>
          </label>

          <div class="form-field">
            <label>Campaign Crest</label>
            <div class="icon-picker-grid">
              ${CAMPAIGN_ICONS.map(
                (ic) => `
                <label class="icon-choice">
                  <input type="radio" name="icon" value="${esc(ic)}" ${icon === ic ? 'checked' : ''} />
                  <span>${esc(ic)}</span>
                </label>
              `
              ).join('')}
            </div>
          </div>

          <div class="form-field">
            <label>Accent Color</label>
            <div class="color-picker-row">
              ${ACTIVITY_COLORS.map(
                (col) => `
                <label class="color-choice">
                  <input type="radio" name="color" value="${esc(col)}" ${color === col ? 'checked' : ''} />
                  <span style="background:${esc(col)}"></span>
                </label>
              `
              ).join('')}
            </div>
          </div>

          <div class="modal-footer">
            <span></span>
            <div class="modal-footer-right">
              <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">${editing ? 'Save Campaign' : '📜 Launch Campaign'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}
