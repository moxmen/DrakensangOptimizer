/**
 * skill-frames.mjs
 * -----------------------------------------------------------------------------
 * Durée d'animation de chaque compétence, exprimée en « frames » (1 s = 25 frames).
 *
 * L'ancienne base `Items.json` ne stockait aucune durée : le calcul des paliers
 * de vitesse était donc toujours identique (25 frames partout). Ces valeurs
 * rétablissent des paliers réalistes et, surtout, restent FACILES À MODIFIER :
 * ce fichier est la seule source de vérité, `npm run data` les injecte dans
 * `public/data/items.json`.
 *
 * Pour ajuster une compétence, changez simplement son nombre de frames.
 * Toute clé absente retombe sur DEFAULT_FRAMES.
 */
export const DEFAULT_FRAMES = 25;

export const SKILL_FRAMES = {
  // ── Guerrier (Dragonknight) ──────────────────────────────────────────────
  AngryStrike: 18,
  Smash: 34,
  RagefulSwing: 28,
  BloodySwing: 30,
  RageJump: 26,
  GroundBreaker: 40,
  IronBrow: 22,
  StunCharge: 32,
  MightySwing: 38,
  DragonFury: 44,
  DeathWail: 36,

  // ── Mage ────────────────────────────────────────────────────────────────
  MagicMissile: 16,
  Fireball: 24,
  IceMissile: 16,
  FrostNova: 30,
  LightningStrike: 28,
  ChainLightning: 32,
  Destruction: 42,
  Singularity: 34,
  Meteor: 46,
  Supernova: 40,

  // ── Rôdeur ──────────────────────────────────────────────────────────────
  HuntingArrow: 17,
  PrecisionShot: 26,
  DeathSwing: 30,
  HuntingTrap: 24,
  ScatterShot: 28,
  DeadlyBlow: 22,
  Falcon: 36,
  BladeDance: 34,
  ThicketThorns: 38,
  ForestRevenge: 34,

  // ── Mécanicien ──────────────────────────────────────────────────────────
  SimpleShot: 16,
  CombatTurret: 26,
  Grenade: 24,
  MGTurret: 30,
  HeavyShot: 38,
  Rocket: 32,
  CoverTurret: 26,
  PlumbRain: 42,
  IronMan: 30,
  VengeanceExplosive: 34,
};
