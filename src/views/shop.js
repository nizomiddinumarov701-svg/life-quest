/**
 * TAB 5: TAVERN REWARDS SHOP VIEW
 */

import {
  MYSTERY_CHEST_COST,
  STREAK_SHIELD_COST,
  STREAK_SHIELD_MAX,
  getRewardCooldownInfo,
  isRedemptionRefundable,
} from '../rpgEngine.js';
import { esc } from './helpers.js';

export function renderShopView(state, derived) {
  const gold = derived.gold;
  const rewards = [...(state.rewards || [])].sort((a, b) => Number(b.epic) - Number(a.epic) || a.cost - b.cost);
  const redemptions = [...(state.rewardRedemptions || [])].sort((a, b) => b.redeemedAt - a.redeemedAt);
  const splitOptions = [0, 25, 40, 50, 70];
  const now = Date.now();

  return `
    <div class="page-head-row">
      <div>
        <h1 class="page-title">Tavern Rewards Shop</h1>
        <p class="page-sub">Protect your Epic Goal savings in the Vault, pace treats with cooldowns, and redeem guilt-free.</p>
      </div>
      <button class="btn btn-primary" data-action="open-new-reward">+ Add Custom Reward</button>
    </div>

    <section class="shop-wallet-banner card">
      <div class="wallet-top-row">
        <div class="wallet-main">
          <div class="wallet-coin-emblem">🪙</div>
          <div>
            <div class="wallet-label">${gold.vaultEnabled ? 'Pocket Gold (Everyday Treats)' : 'Available Gold Balance'}</div>
            <div class="wallet-balance">${gold.pocketBalance.toLocaleString()} Gold</div>
          </div>
        </div>

        ${
          gold.vaultEnabled
            ? `
          <div class="wallet-vault-box">
            <div class="wallet-vault-head">
              <span class="wallet-label">🏦 Epic Savings Vault</span>
              <span class="vault-split-tag">${gold.vaultSplitPercent}% auto-save</span>
            </div>
            <div class="wallet-vault-value">${gold.vaultBalance.toLocaleString()} Gold</div>
            <div class="wallet-vault-actions">
              <button class="btn btn-soft btn-xs" data-action="vault-transfer" data-amount="100" ${gold.pocketBalance < 100 ? 'disabled' : ''} title="Move 100g from Pocket into Epic Vault">+ Stash 100g</button>
              ${
                gold.vaultManualDeposit > 0
                  ? `<button class="btn btn-ghost btn-xs" data-action="vault-transfer" data-amount="-100" title="Move stashed Gold back to Pocket">↩ -100g</button>`
                  : ''
              }
            </div>
          </div>
        `
            : ''
        }

        <div class="wallet-stats">
          <div class="wallet-mini">
            <span>Total Balance</span>
            <strong class="text-gold">${gold.balance.toLocaleString()}g</strong>
          </div>
          <div class="wallet-mini">
            <span>Lifetime Earned</span>
            <strong>+${gold.totalEarned.toLocaleString()}g</strong>
          </div>
          <div class="wallet-mini">
            <span>Earn Rate</span>
            <strong>~${Math.round(90 * derived.streak.multiplier)}g/hr</strong>
          </div>
        </div>
      </div>

      <div class="vault-controls-row">
        <span class="vault-controls-label">🏦 Epic Vault Auto-Save Split:</span>
        <div class="segmented-sm" role="group" aria-label="Epic Savings Vault split percentage">
          ${splitOptions
            .map(
              (pct) => `
            <button
              class="${gold.vaultSplitPercent === pct ? 'is-active' : ''}"
              data-action="set-vault-split"
              data-percent="${pct}"
              title="${pct === 0 ? 'Unified wallet (no separate Epic Vault)' : `Automatically save ${pct}% of all earned Gold for ★ Epic Goals`}"
            >${pct === 0 ? 'Off' : `${pct}%`}</button>
          `
            )
            .join('')}
        </div>
        <span class="vault-controls-hint">
          ${
            gold.vaultEnabled
              ? `Buying everyday treats uses Pocket Gold only — your Epic Vault stays safe!`
              : `Turn on an auto-save % to protect Gold for ★ Epic Goals like your Magnetic Keyboard.`
          }
        </span>
      </div>
    </section>

    <div class="shop-tip-bar">
      💡 Earn ~1.5g/min (× streak boost, plus <strong>+20%</strong> on completed ⚡ Focus Sprints), Daily Quests, Achievements &amp; Weekly Boss Bounties!
    </div>

    <section class="rpg-shop-shelf" aria-label="RPG Power-Ups, Chests & Visual Themes">
      <div class="rpg-shelf-card card">
        <div class="rpg-shelf-head">
          <span class="rpg-shelf-ico">❄️</span>
          <div>
            <h4>Streak Freeze Shield</h4>
            <p>Automatically protects your streak if you miss a future day (max ${STREAK_SHIELD_MAX}).</p>
          </div>
        </div>
        <div class="rpg-shelf-foot">
          <span class="rpg-shelf-meta">Owned: <strong>${derived.streakShields.available} / ${STREAK_SHIELD_MAX}</strong></span>
          <button
            type="button"
            class="btn ${derived.streakShields.available >= STREAK_SHIELD_MAX || gold.pocketBalance < STREAK_SHIELD_COST ? 'btn-soft' : 'btn-gold'} btn-xs"
            data-action="buy-streak-shield"
            ${derived.streakShields.available >= STREAK_SHIELD_MAX || gold.pocketBalance < STREAK_SHIELD_COST ? 'disabled' : ''}
          >
            ${derived.streakShields.available >= STREAK_SHIELD_MAX ? '✓ Max Held' : `❄️ Buy · ${STREAK_SHIELD_COST}g`}
          </button>
        </div>
      </div>

      <div class="rpg-shelf-card card">
        <div class="rpg-shelf-head">
          <span class="rpg-shelf-ico">🧰</span>
          <div>
            <h4>Mystery Loot Chest</h4>
            <p>Instant Rare, Epic, or Legendary RPG gear drop with passive XP/Gold buffs!</p>
          </div>
        </div>
        <div class="rpg-shelf-foot">
          <span class="rpg-shelf-meta">Owned gear: <strong>${(state.inventoryGear || []).length} / 16</strong></span>
          <button
            type="button"
            class="btn ${gold.pocketBalance < MYSTERY_CHEST_COST ? 'btn-soft' : 'btn-gold'} btn-xs"
            data-action="buy-mystery-chest"
            ${gold.pocketBalance < MYSTERY_CHEST_COST ? 'disabled' : ''}
          >
            🎁 Open · ${MYSTERY_CHEST_COST}g
          </button>
        </div>
      </div>

      <div class="rpg-shelf-card card">
        <div class="rpg-shelf-head">
          <span class="rpg-shelf-ico">${esc(derived.activeTheme.icon)}</span>
          <div>
            <h4>RPG Visual Themes</h4>
            <p>Active: <strong>${esc(derived.activeTheme.name)}</strong> (${esc(derived.activeTheme.particleLabel)}).</p>
          </div>
        </div>
        <div class="rpg-shelf-foot">
          <span class="rpg-shelf-meta">Unlocked: <strong>${derived.themes.filter((t) => t.unlocked).length} / ${derived.themes.length}</strong></span>
          <button type="button" class="btn btn-primary btn-xs" data-action="open-themes-modal">
            🎨 Browse Themes
          </button>
        </div>
      </div>
    </section>

    ${
      rewards.length === 0
        ? `
      <div class="empty-card card">
        <div class="empty-emoji">🪙</div>
        <h3>Stock your Tavern Shop</h3>
        <p>Add real-life treats or long-term savings goals you want to unlock with your earned Gold.</p>
        <button class="btn btn-primary" data-action="open-new-reward">+ Add Reward</button>
      </div>
    `
        : `
      <div class="rewards-grid">
        ${rewards
          .map((rew) => {
            const cd = getRewardCooldownInfo(rew, redemptions, now);
            const fundPool = rew.epic
              ? gold.vaultEnabled
                ? gold.vaultBalance
                : gold.balance
              : gold.pocketBalance;
            const canAffordExact = fundPool >= rew.cost;
            const canAffordCombined = rew.epic && gold.vaultEnabled && !canAffordExact && gold.balance >= rew.cost;
            const canRedeemNow = !cd.onCooldown && (canAffordExact || canAffordCombined);
            const pct = Math.min(100, Math.round((fundPool / rew.cost) * 100));
            const remaining = Math.max(0, rew.cost - fundPool);
            const timesRedeemed = redemptions.filter((r) => r.rewardId === rew.id).length;

            return `
              <article class="card reward-card ${rew.epic ? 'is-epic' : ''} ${canRedeemNow ? 'is-affordable' : ''} ${cd.onCooldown ? 'is-cooldown' : ''}">
                <div class="reward-card-head">
                  <div class="reward-icon-badge">${esc(rew.icon)}</div>
                  <div class="reward-head-right">
                    ${rew.epic ? `<span class="epic-tag">★ Epic Goal</span>` : ''}
                    ${rew.cooldownHours > 0 ? `<span class="cooldown-tag" title="Cooldown after each redemption">⏳ ${rew.cooldownHours}h cd</span>` : ''}
                    <span class="reward-cost-pill">🪙 ${rew.cost.toLocaleString()}g</span>
                    <button class="btn btn-ghost btn-xs btn-icon-only" data-action="open-edit-reward" data-id="${esc(rew.id)}" title="Edit reward" aria-label="Edit ${esc(rew.title)}">✎</button>
                  </div>
                </div>

                <h3 class="reward-title">${esc(rew.title)}</h3>
                ${rew.description ? `<p class="reward-desc">${esc(rew.description)}</p>` : ''}

                <div class="reward-progress-block">
                  <div class="xp-bar-track reward-bar-track">
                    <div class="xp-bar-fill ${rew.epic ? 'epic-fill' : 'gold-fill'}" style="width: ${pct}%"></div>
                  </div>
                  <div class="xp-meta-row">
                    <span>
                      ${rew.epic && gold.vaultEnabled ? '🏦 Vault: ' : gold.vaultEnabled ? '🪙 Pocket: ' : ''}
                      <strong>${Math.min(fundPool, rew.cost).toLocaleString()}</strong> / ${rew.cost.toLocaleString()}g (${pct}%)
                    </span>
                    <span>
                      ${
                        cd.onCooldown
                          ? `⏳ Ready in ${esc(cd.remainingLabel)}`
                          : canAffordExact
                            ? 'Ready to claim!'
                            : canAffordCombined
                              ? 'Unlockable using Vault + Pocket!'
                              : `${remaining.toLocaleString()}g to go`
                      }
                    </span>
                  </div>
                </div>

                <div class="reward-footer">
                  ${
                    cd.onCooldown
                      ? `<button class="btn btn-soft btn-sm flex-grow" disabled>⏳ Cooldown · ${esc(cd.remainingLabel)} left</button>`
                      : canRedeemNow
                        ? `<button class="btn btn-gold btn-sm flex-grow" data-action="redeem-reward" data-id="${esc(rew.id)}">🪙 Redeem for ${rew.cost.toLocaleString()}g</button>`
                        : `<button class="btn btn-soft btn-sm flex-grow" disabled>Locked · Need ${remaining.toLocaleString()}g more</button>`
                  }
                  ${timesRedeemed > 0 ? `<span class="redeemed-count-tag">Claimed ×${timesRedeemed}</span>` : ''}
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    `
    }

    <section class="card stats-card" style="margin-top: 1.4rem;">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">🎟️ Redeemed Treats History</h3>
          <p class="card-sub">Rewards you've earned and unlocked with Gold (accidental clicks can be refunded within 10 min)</p>
        </div>
      </div>
      ${
        redemptions.length === 0
          ? `<div class="empty-inline"><p>No treats redeemed yet — keep leveling up and treat yourself when you're ready!</p></div>`
          : `
        <div class="redemption-list">
          ${redemptions
            .slice(0, 20)
            .map((r) => {
              const dt = new Date(r.redeemedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const canRefund = isRedemptionRefundable(r, now);
              return `
                <div class="redemption-row">
                  <span class="redemption-icon">${esc(r.icon)}</span>
                  <div class="redemption-info">
                    <div class="redemption-title">${esc(r.title)}</div>
                    <div class="redemption-meta">Redeemed ${esc(dt)}</div>
                  </div>
                  <span class="redemption-cost">-${r.cost.toLocaleString()}g</span>
                  ${
                    canRefund
                      ? `<button class="btn btn-ghost btn-xs" data-action="refund-redemption" data-id="${esc(r.id)}" title="Undo accidental redemption (available for 10 minutes)">↩ Refund</button>`
                      : `<span class="non-refundable-tag">${r.refundable === false ? 'RPG Item' : 'Claimed'}</span>`
                  }
                </div>
              `;
            })
            .join('')}
        </div>
      `
      }
    </section>
  `;
}
