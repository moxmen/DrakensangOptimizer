/**
 * extra-names.mjs
 * -----------------------------------------------------------------------------
 * L'ancienne base `Langs.json` ne contient aucune entrée pour les quatre
 * talents ultimes JcJ (DeathWail, Supernova, ForestRevenge, VengeanceExplosive)
 * ainsi que pour quelques talents ajoutés après la dernière mise à jour des
 * traductions. On complète ici les cinq langues.
 *
 * Clé = `langid` de l'entrée dans `Items.min.json` (attention : pour ces quatre
 * talents le langid est `DeathWail`, `Supernova`… alors que la clé de l'objet
 * est `DeathWailTalent`).
 * Les clés déjà présentes dans Langs.json ne sont jamais écrasées.
 */
export const EXTRA_TALENT_NAMES = {
  DeathWail: {
    eng: 'Death wail', fra: 'Plainte mortelle', deu: 'Todesklage', esp: 'Lamento mortal',
    ara: 'عويل الموت',
    __description: {
      eng: 'Increases the damage of your PvP ultimate by 400%.',
      fra: 'Augmente les dégâts de votre compétence ultime JcJ de 400 %.',
      deu: 'Erhöht den Schaden deiner PvP-Ultimativen Fähigkeit um 400 %.',
      esp: 'Aumenta un 400 % el daño de tu habilidad definitiva JcJ.',
      ara: 'يزيد ضرر قدرتك القصوى في PvP بنسبة 400%.',
    },
  },
  Supernova: {
    eng: 'Supernova', fra: 'Supernova', deu: 'Supernova', esp: 'Supernova',
    ara: 'المستعر الأعظم',
    __description: {
      eng: 'Increases the damage of your PvP ultimate by 1000%.',
      fra: 'Augmente les dégâts de votre compétence ultime JcJ de 1000 %.',
      deu: 'Erhöht den Schaden deiner PvP-Ultimativen Fähigkeit um 1000 %.',
      esp: 'Aumenta un 1000 % el daño de tu habilidad definitiva JcJ.',
      ara: 'يزيد ضرر قدرتك القصوى في PvP بنسبة 1000%.',
    },
  },
  ForestRevenge: {
    eng: 'Forest revenge', fra: 'Vengeance de la forêt', deu: 'Rache des Waldes', esp: 'Venganza del bosque',
    ara: 'انتقام الغابة',
    __description: {
      eng: 'Increases the damage of your PvP ultimate by 150% over 4 hits.',
      fra: 'Augmente les dégâts de votre compétence ultime JcJ de 150 % sur 4 coups.',
      deu: 'Erhöht den Schaden deiner PvP-Ultimativen Fähigkeit um 150 % über 4 Treffer.',
      esp: 'Aumenta un 150 % el daño de tu habilidad definitiva JcJ en 4 golpes.',
      ara: 'يزيد ضرر قدرتك القصوى في PvP بنسبة 150% على 4 ضربات.',
    },
  },
  VengeanceExplosive: {
    eng: 'Explosive vengeance', fra: 'Vengeance explosive', deu: 'Explosive Rache', esp: 'Venganza explosiva',
    ara: 'الانتقام المتفجر',
    __description: {
      eng: 'Increases the damage of your PvP ultimate by 600%.',
      fra: 'Augmente les dégâts de votre compétence ultime JcJ de 600 %.',
      deu: 'Erhöht den Schaden deiner PvP-Ultimativen Fähigkeit um 600 %.',
      esp: 'Aumenta un 600 % el daño de tu habilidad definitiva JcJ.',
      ara: 'يزيد ضرر قدرتك القصوى في PvP بنسبة 600%.',
    },
  },
};
