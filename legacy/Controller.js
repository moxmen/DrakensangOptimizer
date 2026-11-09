var DrakenOptimApp = angular.module('DrakenOptimApp', ['angucomplete-alt','ngAnimate','ngTouch']);

// Language init
var language = window.navigator.userLanguage || window.navigator.language;
if (language.match(/fr$/i)) { SelectedLang = 'fra'; }
else if (language.match(/de$/i)) { SelectedLang = 'deu'; }
else if (language.match(/es$/i)) { SelectedLang = 'esp'; }
else { SelectedLang = 'eng'; } // default language

// Sanitization necessary for the blob object used for downloading profile file
	DrakenOptimApp.config(function ($compileProvider) {
		$compileProvider.aHrefSanitizationWhitelist(/^\s*(|blob|):/);
	});

DrakenOptimApp.controller('MainCtrl', ['$scope', '$http', '$filter', 'DataImport', 'equipsFactory', function ($scope, $http, $filter, DataImport, equipsFactory) {
	
	$scope.db = {};
	$scope.langs = ['eng', 'fra', 'deu', 'esp'];
	$scope.jobs = ['WAR', 'SW', 'RNG', 'DWF'];
	$scope.selectedJob = 'WAR';
	$scope.selectedLang = SelectedLang;
	$scope.selectedLevel = 45;
	$scope.KnowledgeLvl = 30;
	$scope.PvPLvl = 0;
	$scope.selectedPet = 'nopet';
	$scope.OpponentSelector = "pve";
	$scope.OpponentLevel = 45;
	$scope.OpponentPvPLvl = 0;
	$scope.OpponentDefense = 0;
	$scope.OpponentResist = 0;
	$scope.MarkedStatus = true;
	$scope.selectedEss = 'blank';
	$scope.selectedTalents = { 'ExpTree': [], 'PvPtree': [] };
	$scope.talentedSkills = [];
	$scope.setSkills = [];
	$scope.extendedMode = false;

	var AllSlots = ['amulets', 'waists', 'weapondecorations', 'ring1', 'ring2',
			'headarmors', 'shoulders', 'torsos', 'gloves', 'boots',
			'weapons', 'offhands', 'mantles'];

	// ==========================================  View Methods  ==========================================

	// Requests to server for populating local database then loads numbers into interface fields
	$scope.ImportData = function (rst) {
		return DataImport.getData($scope.selectedJob, $scope.selectedLang)
			.then(function (promise) {
				$scope.db = promise;
				angular.forEach($scope.db.weapons, function (wp) {
					wp.speedbase = 1/wp.durationbase;
					delete wp.durationbase;
				});
				console.log('Local database objects for '+ $scope.selectedJob +':');
				console.log($scope.db);
				if (rst) $scope.resetAll();
			});
	};
	$scope.ImportData(true);

	// Forum link init
	$scope.ForumLink = function (lg) {
		var f = document.getElementById('Forum'),
		localredir = '', threadref = '';
		if (lg == 'fra') { localredir = 'http://fr'; threadref = '47860'; }
		else { localredir = 'http://en'; threadref = '48499'; }
		f.href = localredir + '.bigpoint.com/drasaonline/board/threads/drakensang-optimizer.' + threadref;
	};
	$scope.ForumLink($scope.selectedLang);

	$scope.resetAll = function () {
		equipsFactory.defaultSlotsINIT($scope.selectedJob);
		equipsFactory.resetAll($scope.selectedJob);
		angular.forEach(AllSlots, function (slot) {
			$scope.resetGlobalStats(slot);
			$scope.equipIcon(slot);
		});
		if ($scope.db.constants) $scope.calculAll();
	};

	$scope.equipIcon = function (slot) {
		var btn = document.getElementById(slot),
			obj = equipsFactory.get(slot);
		btn.style.background = "url('Images/" + obj.icon + ".png') no-repeat";
		if (slot=='weapons' && obj.TwoHandedWeapon && $scope.selectedJob != 'RNG') {
			document.getElementById('offhands').style.background = "url('Images/" + obj.icon + ".png') no-repeat";
			equipsFactory.reset('offhands');
			$scope.resetGlobalStats('offhands');
		}
	};

	$scope.saveProfile = function () {
		var content = {};
		content['job'] = $scope.selectedJob;
		content['level'] = $scope.selectedLevel;
		content['knowledge'] = $scope.KnowledgeLvl;
		content['pvplevel'] = $scope.PvPLvl;
		content['pet'] = $scope.selectedPet;
		content['vs'] = $scope.OpponentSelector;
		content['vslevel'] = $scope.OpponentLevel;
		content['vspvplevel'] = $scope.OpponentPvPLvl;
		content['vsdefense'] = $scope.OpponentDefense;
		content['vsresist'] = $scope.OpponentResist;
		content['marked'] = $scope.MarkedStatus;
		content['essence'] = $scope.selectedEss;
		content['talents'] = $scope.selectedTalents;

		angular.forEach(AllSlots, function (slot) {
			content[slot] = equipsFactory.get(slot);
		});

		var blob = new Blob([angular.toJson(content)], { type: 'text/plain' });
		$scope.url = (window.URL || window.webkitURL).createObjectURL(blob);
	};

	$scope.loadProfile = function (profile) {
		$scope.selectedJob = profile.job;
		$scope.ImportData(true)
		.then(function () {
			$scope.selectedLevel = profile.level;
			$scope.KnowledgeLvl = profile.knowledge;
			$scope.PvPLvl = profile.pvplevel;
			$scope.selectedPet = profile.pet;
			$scope.OpponentSelector = profile.vs;
			$scope.OpponentLevel = profile.vslevel;
			$scope.OpponentPvPLvl = profile.vspvplevel;
			$scope.OpponentDefense = profile.vsdefense;
			$scope.OpponentResist = profile.vsresist;
			$scope.MarkedStatus = profile.marked;
			$scope.selectedEss = profile.essence;
			$scope.selectedTalents = profile.talents;

			angular.forEach(AllSlots, function (slot) {
				equipsFactory.put(slot, profile[slot]);
			});

			angular.forEach(AllSlots, function (slot) {
				$scope.updateGlobalStats(slot);
				$scope.equipIcon(slot);
			});
			$scope.calculTalents();
		});
	};

	$scope.Description = function (obj) {
		if (obj) {
			var result = "";
			if (/essence|essenz|esenc/i.test(obj.name)) {
				result += $scope.db.sysmess['damage'] + ' + ';
				if (obj.damage <= 4) {
					if ($scope.OpponentSelector == 'pvp') { result += '0%'; }
					else { result += obj.damage * 100 + '%'; }
				} else { result += obj.damage; }
			} else {
				angular.forEach(obj, function (value, key) {
					if (!/name|key|icon|slots|category/i.test(key)) {
						if (result.length) { result += '\n'; }
						if (value < 1) { value = value * 100 + '%'; }
						if (!/weapondamageboost|critboost|itemarmorboost/.test(key)) { key = key.replace('boost', ''); }
						result += $scope.db.sysmess[key] + ' + ' + value;
					}
				});
			}
			return result;
		}
	}
	// ==========================================  Application logic  ==========================================

	//Stat structure: Stat > Total + Slot > values from Base | Enchants | Gems
	//13 sub-arrays: 0=AmuletStats, 1=WaistStats, 2=WeaponDecorationStats, etc..., 11=BootsStats, 12=MantleStats
	//For each sub-array: column0=basic stats, column1=stats from enchants, column2=Stats from gems, column3=final stats
	//rows designate each possible stat in the game
	$scope.GlobalStats = {};
	var AllStats = ['damage', 'damageboost', 'damagepve', 'damagepvp', 'damagemin', 'damagemax',
				'damageminboost', 'damagemaxboost', 'weapondamageboost', 'damage2H',
				'critrate', 'critrateboost', 'critboost', 'speed', 'movspeed',
				'armor', 'armorboost', 'itemarmorboost', 'life', 'lifeboost', 'regen',
				'blockrate', 'blockrateboost', 'blockeddmg', 'blockeddmgboost',
				'resist', 'resistboost', 'fire', 'ice', 'lightning', 'poison', 'andermagic',
				'fireboost', 'iceboost', 'lightningboost', 'poisonboost', 'andermagicboost'];
	// initialization and linking to view
	angular.forEach(AllStats, function (stat) {
		$scope.GlobalStats[stat] = { Total: 0, fromPet: 0, fromSets: 0, fromTalents: 0 };
		angular.forEach(AllSlots, function (slot) {
			$scope.GlobalStats[stat][slot] = { fromBase: 0, fromEnch: 0, fromGems: 0 };
		});
	});
	console.log('Global stats object :');
	console.log($scope.GlobalStats);

	//resets the model 'GlobalStats'
	$scope.resetGlobalStats = function (slot) {
		angular.forEach($scope.GlobalStats, function (stat) {
			stat.fromPet = 0; stat.fromSets = 0; stat.fromTalents = 0;
			stat[slot] = { fromBase: 0, fromEnch: 0, fromGems: 0 };
		});
	};

	//filling current data into the model 'GlobalStats'
	$scope.updateGlobalStats = function (slot) {
		var obj = equipsFactory.get(slot);
		angular.forEach(AllStats, function (stat) {
			$scope.GlobalStats[stat][slot] = { fromBase: 0, fromEnch: 0, fromGems: 0 };
		});
		angular.forEach(obj.basestats, function (v) {
			$scope.GlobalStats[v.label.replace('base', '')][slot].fromBase += v.value;
		});
		angular.forEach(obj.enchants, function (v) {
			if (v.label.length) {
				$scope.GlobalStats[v.label][slot].fromEnch += v.value;
			}
		});
		angular.forEach(obj.gems, function (g) {
			if (g.key != 'nogem') {
				var dbgem = $filter('findByPropertyValue')($scope.db.gems,'key',g.key);
				angular.forEach(dbgem, function (v, k) {
					if (!/name|key|icon|slots|category/i.test(k)) {
						$scope.GlobalStats[k][slot].fromGems += v;
					}
				});
			}
		});
		$scope.calculAll();
	};

	// calculate all stat bonuses from set into $scope.fromSetsBonuses
	$scope.calculSets = function () {
		// first get all unic equipped items (other types don't have set properties)
		var eqpList = [];
		angular.forEach(AllSlots, function (slot) {
			var eqp = equipsFactory.get(slot);
			if (eqp.unic && !RegExp(eqp.hashkey).test(eqpList)) { eqpList.push(eqp.hashkey); }
		});
		// next compare eqpList with each set property 'setpieces', and min number of setpieces
		// setSkills et GlobalStats are models for later calculations
		// while SetsBonuses is a ModelView for equipDisplayTemplate.html
		$scope.SetsBonuses = [];
		$scope.setSkills = [];
		angular.forEach(AllStats, function (stat) {
			$scope.GlobalStats[stat].fromSets = 0;
		});
		if (eqpList.length >= 2) {
			angular.forEach($scope.db.sets, function (set, key) {
				if (eqpList.length >= 2) {
					var count = 0, bn = {}, eqL = angular.copy(eqpList),
					nbmax = set.setbonus[set.setbonus.length - 1].nbpieces;
					for (var i = 0; i < eqL.length; i++) {
						if (RegExp(set.setpieces.replace(/,/g, '|')).test(eqL[i])) {
							eqpList.splice(i - count, 1); count++;
							if (count == nbmax) break;
						}
					}
					if (count >= set.setbonus[0].nbpieces) {
						for (var c = 0; c < set.setbonus.length; c++) {
							if (set.setbonus[c].nbpieces <= count) {
								for (var b in set.setbonus[c]) {
									if (b == 'skill') {
										bn[b+c] = [set.setbonus[c][b],set.setbonus[c].damageboost];
										var foundit = $filter('findByPropertyValue')($scope.setSkills, 'key', set.setbonus[c][b]);
										if (foundit) { foundit.bonus += set.setbonus[c].damageboost; }
										else { $scope.setSkills.push({ 'key': set.setbonus[c][b], 'bonus': set.setbonus[c].damageboost }); }
										break;
									}
									else if (b != 'nbpieces') {
										bn[b] ? (bn[b] += set.setbonus[c][b]) : (bn[b] = set.setbonus[c][b]);
										$scope.GlobalStats[b].fromSets += set.setbonus[c][b];
									}
								}
							} else { break; }
						}
						bn.key = key;
						bn.count = count;
						bn.maxcount = nbmax;
						$scope.SetsBonuses.push(bn);
					}
				}
			});
		}
	};

	//Calculate bonuses from talents
	$scope.calculTalents = function () {
		$scope.talentedSkills = [];
		angular.forEach(AllStats, function (stat) {
			$scope.GlobalStats[stat].fromTalents = 0;
		});

		angular.forEach($scope.selectedTalents, function (cat, key) {
			if ($scope.OpponentSelector == 'pvp' || key == 'ExpTree') {
				angular.forEach(cat, function (tl) {
					if (tl && tl.length) {
						var t = $scope.db.talents[tl],
						tgtskills = t.targetedskills ? t.targetedskills.split(',') : [],
						is2H = equipsFactory.get('weapons').TwoHandedWeapon,
						test2H = (tl == "TwoHandedMaster" || tl == "LongbowAce") && is2H,
						test1H = tl == "ShortbowAce" && !is2H,
						talentedStat = Object.keys(t).filter(function (k) { return !/name|description|category|level|icon|targetedskills|nbdot/.test(k); })[0];
						if (!t.targetedskills) { //generic talents
							if (test2H || test1H || !/TwoHandedMaster|LongbowAce|ShortbowAce/.test(tl)) {
								$scope.GlobalStats[talentedStat].fromTalents += t[talentedStat];
							}
						} else { //talents for specific skills
							angular.forEach(tgtskills, function (s) {
								var foundit = $filter('findByPropertyValue')($scope.talentedSkills, 'key', s);
								if (foundit) {
									foundit.nbdot += t.nbdot ? t.nbdot : 0;
									foundit.bonus += t[talentedStat];
								}
								else { $scope.talentedSkills.push({ 'key': s, 'bonus': t[talentedStat], 'nbdot': t.nbdot ? t.nbdot : 0 }); }
							});
						}
					}
				});
			}
		});
		$scope.calculAll();
	};

	//Calculate final values :
	$scope.calculAll = function () {
		$scope.calculSets();
		var sGS = $scope.GlobalStats;

		//handles selected pet
		angular.forEach(AllStats, function (stat) { sGS[stat].fromPet = 0; });
		angular.forEach($scope.db.companions[$scope.selectedPet], function (value, key) {
			if (!/name|icon/.test(key)) { sGS[key].fromPet = value; }
		});

		angular.forEach(sGS, function (stat, key) {
			stat.Total = stat.fromPet + stat.fromSets + stat.fromTalents;
			angular.forEach(AllSlots, function (slot) {
				if (!(slot == 'weapons' && /weapondamageboost|damage(|min|max)$/.test(key)) && !(slot == 'offhands' && /^block/.test(key)) && !(/^(armor|itemarmorboost)$/.test(key))) {
					if (slot == 'weapons' && key == 'speed') { stat.Total += stat[slot].fromGems; }
					else { stat.Total += stat[slot].fromBase + stat[slot].fromEnch + stat[slot].fromGems; }
				}
			});
		});

		// particular cases
		var is2H = equipsFactory.get('weapons').TwoHandedWeapon;
		if (is2H) sGS.weapondamageboost.Total += sGS.damage2H.Total;
		var EssDMG = $scope.selectedEss ? $scope.db.essences[$scope.selectedEss].damage : 0;
		if (EssDMG < 5) { sGS.damageboost.Total += $scope.OpponentSelector != 'pvp' ? EssDMG : 0; }
		else { sGS.damage.Total += EssDMG; }
		sGS.life.Total += $scope.db.constants[$scope.selectedLevel].basehp;
		angular.forEach(['fire', 'ice', 'lightning', 'poison', 'andermagic'], function (elt) {
			sGS[elt].Total += sGS.resist.Total;
			sGS[elt + 'boost'].Total += sGS.resistboost.Total;
		});
		sGS.damagemin.Total += $scope.db.constants[$scope.selectedLevel].basedmg + sGS.damage.Total;
		sGS.damagemax.Total += $scope.db.constants[$scope.selectedLevel].basedmg + sGS.damage.Total;
		// terms specific to the weapon
		sGS.speed.Total = ((sGS.speed.weapons.fromBase ? sGS.speed.weapons.fromBase : 1) * (1 + sGS.speed.weapons.fromEnch)) * (1 + sGS.speed.Total);
			var ModifiedWeapDamageMin = (sGS.damagemin.weapons.fromBase + 
										 sGS.damagemin.weapons.fromEnch + 
										 sGS.damagemin.weapons.fromGems + 
										 sGS.damage.weapons.fromEnch + 
										 sGS.damage.weapons.fromGems) * (1 + sGS.weapondamageboost.weapons.fromEnch);
			var ModifiedWeapDamageMax = (sGS.damagemax.weapons.fromBase + 
										 sGS.damagemax.weapons.fromEnch + 
										 sGS.damagemax.weapons.fromGems + 
										 sGS.damage.weapons.fromEnch + 
										 sGS.damage.weapons.fromGems) * (1 + sGS.weapondamageboost.weapons.fromEnch);
		sGS.damagemin.Total += ModifiedWeapDamageMin * (1 + sGS.weapondamageboost.Total);
		sGS.damagemax.Total += ModifiedWeapDamageMax * (1 + sGS.weapondamageboost.Total);
		// terms specific to the shields
		sGS.blockrate.Total += (sGS.blockrate.offhands.fromBase + sGS.blockrate.offhands.fromEnch) * (1 + sGS.blockrateboost.offhands.fromEnch);
		sGS.blockeddmg.Total += (sGS.blockeddmg.offhands.fromBase + sGS.blockeddmg.offhands.fromEnch) * (1 + sGS.blockeddmgboost.offhands.fromEnch);
		// terms specific to the stat "itemarmorboost"
		var iab = sGS.itemarmorboost, iabslot = 0;
		angular.forEach(AllSlots, function (slot) {
			iabslot = iab[slot].fromEnch + iab[slot].fromGems;
			sGS.armor.Total += (sGS.armor[slot].fromBase + sGS.armor[slot].fromEnch + sGS.armor[slot].fromGems)*(1+iabslot);
		});
		
		var BonusKnowledge = $scope.KnowledgeLvl / 100,
		BonusPVPlevel = $scope.OpponentSelector == 'pvp' ? ($scope.PvPLvl - $scope.OpponentPvPLvl) / 100 : 0,
		BonusPVParena = 0; //$scope.OpponentSelector == 'pvp' ? 0.3 : 0;
		angular.forEach(sGS, function (stat, key) {
			var t = sGS[key + 'boost'];
			if (key == 'life') { stat.Total += stat.Total * (t.Total + BonusKnowledge) }
			else if (/^(armor|fire|ice|poison|lightning|andermagic)$/.test(key)) {
				stat.Total += stat.Total * (t.Total + BonusPVPlevel - BonusPVParena);
			}
			else if (!/boost$|resist|damage/.test(key) && t) {
				stat.Total += stat.Total * t.Total;
			}
		});
		sGS.regen.Total += sGS.life.Total / 100;
		var multiplier = sGS['damage' + $scope.OpponentSelector].Total + sGS.damageboost.Total; //damagepve/pvp
		multiplier += BonusKnowledge + BonusPVPlevel + BonusPVParena;
		sGS.damagemin.Total = Math.floor(sGS.damagemin.Total * (1 + sGS.damageminboost.Total + multiplier));
		sGS.damagemax.Total = Math.floor(sGS.damagemax.Total * (1 + sGS.damagemaxboost.Total + multiplier));

		var accr = $scope.db.constants[$scope.OpponentLevel].accr;
		$scope.critratePercentage = sGS.critrate.Total / (sGS.critrate.Total + accr);
		$scope.critratePercentage = $scope.critratePercentage > 0.8 ? 0.8 : $scope.critratePercentage;
		$scope.armorPercentage = sGS.armor.Total / (sGS.armor.Total + accr);
		$scope.armorPercentage = $scope.armorPercentage > 0.8 ? 0.8 : $scope.armorPercentage;
		$scope.firePercentage = sGS.fire.Total / (sGS.fire.Total + accr);
		$scope.firePercentage = $scope.firePercentage > 0.8 ? 0.8 : $scope.firePercentage;
		$scope.icePercentage = sGS.ice.Total / (sGS.ice.Total + accr);
		$scope.icePercentage = $scope.icePercentage > 0.8 ? 0.8 : $scope.icePercentage;
		$scope.lightningPercentage = sGS.lightning.Total / (sGS.lightning.Total + accr);
		$scope.lightningPercentage = $scope.lightningPercentage > 0.8 ? 0.8 : $scope.lightningPercentage;
		$scope.poisonPercentage = sGS.poison.Total / (sGS.poison.Total + accr);
		$scope.poisonPercentage = $scope.poisonPercentage > 0.8 ? 0.8 : $scope.poisonPercentage;
		$scope.andermagicPercentage = sGS.andermagic.Total / (sGS.andermagic.Total + accr);
		$scope.andermagicPercentage = $scope.andermagicPercentage > 0.8 ? 0.8 : $scope.andermagicPercentage;

		$scope.blockratePercentage = sGS.blockrate.Total / (sGS.blockrate.Total + $scope.db.constants[$scope.OpponentLevel].blockrate);
		$scope.blockeddmgPercentage = sGS.blockeddmg.Total / (sGS.blockeddmg.Total + $scope.db.constants[$scope.OpponentLevel].blockeddmg);
		$scope.blockratePercentage = $scope.blockratePercentage > 0.8 ? 0.8 : $scope.blockratePercentage;
		$scope.blockeddmgPercentage = $scope.blockeddmgPercentage > 0.8 ? 0.8 : $scope.blockeddmgPercentage;

		var MeanDMG = (sGS.damagemin.Total + sGS.damagemax.Total) / 2;
		$scope.DPS = (1 - $scope.critratePercentage + $scope.critratePercentage * (2 + sGS.critboost.Total)) * MeanDMG * sGS.speed.Total;

		$scope.calculSkills();
	};

	// calculate each skill's damage into Model SkillsDamage = [{min:dmg,max:dmg,critmin:dmg,critmax:dmg}]
	$scope.calculSkills = function () {
		$scope.SkillsDamage = [];
		$scope.SpeedSteps = [];

		angular.forEach($scope.db.skills, function (sk, key) {
			var obj = { min: 0, max: 0, critmin: 0, critmax: 0 },
			dmgmin = $scope.GlobalStats.damagemin.Total,
			dmgmax = $scope.GlobalStats.damagemax.Total,
			BonusMarking = ($scope.MarkedStatus && sk.markable) ? 2 : 1,
			CritBoost = 2 + $scope.GlobalStats.critboost.Total,
			tltSkill = $scope.talentedSkills.filter(function (o) { return o.key == key; })[0],
			setSkill = $scope.setSkills.filter(function (o) { return o.key == key; })[0],
			nbdot = (sk.nbdot ? sk.nbdot : 1) + (tltSkill ? (tltSkill.nbdot - (!sk.nbdot && tltSkill.nbdot) ? 1 : 0) : 0),
			skdmg = sk.value,
			BonusTalent = 0;

			if (tltSkill) {
				if (tltSkill.bonus && !sk.value) { skdmg += tltSkill.bonus; }
				else BonusTalent += tltSkill.bonus;
			}
			if (setSkill) {
				if (setSkill.bonus && !sk.value) { skdmg += setSkill.bonus; }
				else BonusTalent += setSkill.bonus;
			}
			//Calcul normal damage ranges, before accounting for crits and resists
			var NormDMGmin = 0, NormDMGmax = 0;
			NormDMGmin = Math.floor(((dmgmin * skdmg) * nbdot) * (1 + BonusTalent)) * BonusMarking;
			NormDMGmax = Math.floor(((dmgmax * skdmg) * nbdot) * (1 + BonusTalent)) * BonusMarking;

			//Dissociation of calculations depending on the skill's phys/magical parts,
			//then apply crits and resists
			var NormDMGphys = 0, NormDMGmagic = 0, NormDMGminphys = 0, NormDMGmaxphys = 0, NormDMGminmagic = 0, NormDMGmaxmagic = 0,
			CritDMGphys = 0, CritDMGmagic = 0, CritDMGminphys = 0, CritDMGmaxphys = 0, CritDMGminmagic = 0, CritDMGmaxmagic = 0;
			if (!sk.magicshare) { sk.magicshare = 0; }

			NormDMGminphys = Math.floor((NormDMGmin * (1 - sk.magicshare)) * (1 - $scope.OpponentDefense));
			NormDMGmaxphys = Math.floor((NormDMGmax * (1 - sk.magicshare)) * (1 - $scope.OpponentDefense));
			NormDMGminmagic = Math.floor((NormDMGmin * sk.magicshare) * (1 - $scope.OpponentResist));
			NormDMGmaxmagic = Math.floor((NormDMGmax * sk.magicshare) * (1 - $scope.OpponentResist));
			CritDMGminphys = Math.floor(((NormDMGmin * CritBoost) * (1 - sk.magicshare)) * (1 - $scope.OpponentDefense));
			CritDMGmaxphys = Math.floor(((NormDMGmax * CritBoost) * (1 - sk.magicshare)) * (1 - $scope.OpponentDefense));
			CritDMGminmagic = Math.floor(((NormDMGmin * CritBoost) * sk.magicshare) * (1 - $scope.OpponentResist));
			CritDMGmaxmagic = Math.floor(((NormDMGmax * CritBoost) * sk.magicshare) * (1 - $scope.OpponentResist));

			//update the model
			obj.min = Number(NormDMGminphys + NormDMGminmagic);
			obj.max = Number(NormDMGmaxphys + NormDMGmaxmagic);
			obj.critmax = Number(CritDMGmaxphys + CritDMGmaxmagic);
			//worst case for critmin is when only the lowest damage part receives the crit bonus
			if (sk.magicshare > 0 && sk.magicshare < 0.5) {
				obj.critmin = Number(NormDMGminphys + CritDMGminmagic);
			}
			else if (sk.magicshare >= 0.5 && sk.magicshare < 1) {
				obj.critmin = Number(CritDMGminphys + NormDMGminmagic);
			}
			else { obj.critmin = Number(CritDMGminphys + CritDMGminmagic); }
			$scope.SkillsDamage.push(obj);
			
			var speedstep = { min: 0, max: 0, dps: 0 },
				MeanDMG = (obj.min + obj.max) / 2,
				trueSpeed = 25 / Math.ceil( 0.5 + sk.frames/$scope.GlobalStats.speed.Total );
			speedstep.min = Math.round( ( sk.frames / (25/trueSpeed-0.5) )*1000 ) /1000;
			speedstep.max = Math.round( ( sk.frames / (25/trueSpeed-1.5) )*1000 ) /1000;
			speedstep.dps = (1 - $scope.critratePercentage + $scope.critratePercentage * (2 + $scope.GlobalStats.critboost.Total)) * MeanDMG * speedstep.min;
			$scope.SpeedSteps.push(speedstep);
		});
	};
	
} ]);