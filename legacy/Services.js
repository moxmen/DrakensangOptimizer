//  =============================================  SERVICES  =============================================

// Database initialized with job='war' and autodetected browser language
DrakenOptimApp.factory('DataImport', ['$http', function ($http) {
    return {
        getData: function (job, lang) {
            var request = $http({
                method: 'POST',
                url: 'sql2json.php',
                data: { 'job': job, 'lang': lang }
            });
            return request.then(handleSuccess, handleError);
        }
    };
    // Note: $http built-in success & error methods actually don't return a complete promise
    // using .then() instead
    function handleSuccess(response) { return response.data; }
    function handleError(response) { return { 'msg':response.data, 'status':response.statusText}; }

} ]);


// 'equipsFactory' is the final object containing data for each user-defined items, stored in sessionStorage
// 'defaultSlots' is used to reset all properties of a particular item from 'equipsFactory'
DrakenOptimApp.factory('equipsFactory', function() {
    return {
        put: function(slot,equip) {
            sessionStorage.setItem(slot, angular.toJson(equip));
        },
        get: function(slot) {
            return JSON.parse(sessionStorage.getItem(slot));
        },
        getAll: function() {
            var equips = [],
            slots = ['amulets', 'waists', 'weapondecorations', 'ring1', 'ring2',
                'headarmors', 'shoulders', 'torsos', 'gloves', 'boots',
                'weapons', 'offhands', 'mantles'];
            for (var slot in slots) {
                var equip = sessionStorage.getItem(sessionStorage.key(slot));
                equips.push(JSON.parse(equip));
            }
            return equips;
        },
        defaultSlotsINIT: function(job) {
            // defaultSlots holds default values for each equip's properties
            var ds = { 'amulets': {}, 'waists': {}, 'weapondecorations': {}, 'ring1': {}, 'ring2': {},
                'headarmors': {}, 'shoulders': {}, 'torsos': {}, 'gloves': {}, 'boots': {},
                'weapons': {}, 'offhands': {}, 'mantles': {}
            };
            angular.forEach(ds, function (value, key) {
                value.hashkey = '';
                value.name = '';
                value.quality = 'empty';
                if (/weapons|offhands/.test(key)) { value.type = ''; }
                else { value.type = key.replace(/1|2/, 's'); }
                value.finalStats = [];
                value.enchants = [{ label: '', value: 0 }, { label: '', value: 0 }, { label: '', value: 0 }, { label: '', value: 0 }];
                value.gems = [{ key: 'nogem' }, { key: 'nogem' }, { key: 'nogem' }, { key: 'nogem' }, { key: 'nogem'}];
                value.reqlvl = 1;
                if (/waists|mantles/.test(key)) { value.icon = key + 'empty'; }
                else if (/ring/.test(key)) { value.icon = 'ringsempty'; }
                else { value.icon = key + job + 'empty'; }
                if (!/amulets|weapondecorations|ring|weapons|essences|offhands/.test(key)) {
                    value.basestats = [{ label: 'armorbase', value: 0}];
                } else if (key == 'weapons') {
                    value.TwoHandedWeapon = false;
                    value.basestats = [{ label: 'damageminbase', value: 0 }, { label: 'damagemaxbase', value: 0 }, { label: 'speedbase', value: 0}];
                } else if (key == 'offhands') {
                    value.basestats = [{ label: 'armorbase', value: 0 }, { label: 'blockratebase', value: 0 }, { label: 'blockeddmgbase', value: 0}];
                } else { value.basestats = []; }
            });
            sessionStorage.setItem('defaultSlots', angular.toJson(ds));
        },
        reset: function(slot) {
            var defSlot = JSON.parse( sessionStorage.getItem('defaultSlots') )[slot];
            sessionStorage.setItem( slot, angular.toJson(defSlot) );
        },
        resetAll: function(job) {
            var ds = JSON.parse( sessionStorage.getItem('defaultSlots') );
            angular.forEach(ds, function (value, key) {
                sessionStorage.setItem(key, angular.toJson(value));
            });
        }
    };
});