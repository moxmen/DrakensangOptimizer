//  =============================================  FILTERS  =============================================
DrakenOptimApp.filter('percentage', ['$filter', function($filter) {
    return function(input, decimals) {
        if (Math.abs(input) <= 2) { return $filter('number')(input*100, decimals)+'%'; }
        return input;
    };
}]);

DrakenOptimApp.filter('labelboost', function () {
	return function (property) {
		if (/^skill/.test(property)) property = property.slice(0,property.length-1);
	    else if (!/weapondamageboost|critboost|itemarmorboost/.test(property)) property = property.replace('boost','');
        return property;
	};
});

//
DrakenOptimApp.filter('findByPropertyValue', function () {
    return function(collection,property,value) {
        if (value.length > 3) {
            var i=0, indices = Object.keys(collection), len=indices.length;
            for (i;i<len;i++) {
                if (collection[indices[i]][property] == value) {
                    collection[indices[i]].hashkey = indices[i];
                    return collection[indices[i]];
                }
            }
        }
    }
});

// filter preventing the ng-repeater reordering automatically the keys.
DrakenOptimApp.filter('keys', function () {
	return function (input) {
	    if (!input) { return []; }
	    return Object.keys(input);
	};
});

// orderBy filter working only with arrays, this routine converts a hashobject
DrakenOptimApp.filter('orderObjectBy', function () {
    return function (items, field, reverse) {
        var filtered = [];
        angular.forEach(items, function (item, key) {
            item.key = key;
            filtered.push(item);
        });
        filtered.sort(function (a, b) {
            return (a[field] > b[field] ? 1 : -1);
        });
        if (reverse) { filtered.reverse(); }
        return filtered;
    };
});

DrakenOptimApp.filter('FilterTalent', function () {
    return function (input, cat, lvl) {
        var result = [];
        angular.forEach(input, function (value,key) {
            if (value.category==cat && value.level==lvl) { result.push(key); }
        });
        return result;
    };
});