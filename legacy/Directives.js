// Display directive showing chosen stats of your equipments (Tooltips), with integrated editor
DrakenOptimApp.directive('equipDisplay', ['$filter', 'equipsFactory', function($filter,equipsFactory) {
    return {
        restrict: 'AE',
        scope: true,
        templateUrl: 'equipDisplayTemplate.html',
        link: function (scope, elem, attrs) {
            
            scope.resetAll();

            scope.delete = function(e) {
                var slot = e.target.attributes.id.value;
                equipsFactory.reset(slot);
                scope.resetGlobalStats(slot);
                scope.equipIcon(slot);
				scope.calculAll();
            };

            // Editor holds properties necessary for building its template
            // item is the temp holder for the edited item's stats
            scope.editor = { slot: '', dbtype: '', BaseTemplate: '', item: {} };
            var edt = scope.editor;

            scope.editMode = false;

            scope.openEditor = function(e) {
                var element = e.target,
                    slot = element.attributes.id.value;
                if (scope.editMode) { alert(scope.db.sysmess['sys68']); } // editor already opened
                else if (slot == 'offhands' && equipsFactory.get('weapons').TwoHandedWeapon && scope.selectedJob!='RNG') {
                    alert(scope.db.sysmess['sys69']); } // can't edit offhand while wearing a 2handed weapon
                else {
                    edt.slot = slot;
                    edt.dbtype = slot.replace(/1|2/, 's');
                    edt.item = equipsFactory.get(slot);
                    document.getElementById('editorItemName_input').value = edt.item.name;

                    //builds the autocomplete source
                    scope.editordb = [];
                    angular.forEach(scope.db[edt.dbtype], function(obj,key) {
                        var subobj = angular.copy(obj);
                        subobj.hashkey = key;
                        scope.editordb.push(subobj);
                    });

                    if (slot == 'weapons') { edt.BaseTemplate = 'Weapons'; }
                    else if (slot == 'offhands' && scope.selectedJob == 'WAR') { edt.BaseTemplate = 'Shields'; edt.item.type = 'shield'; }
                    else if (/amulets|weapondecorations|ring/.test(slot)) { edt.BaseTemplate = ''; }
                    else if (/orb|shield/.test(edt.item.type)) { edt.BaseTemplate = 'Shields'; }
                    else if (/book|quiver|wrench/.test(edt.item.type)) { edt.BaseTemplate = 'Attack'; }
                    else edt.BaseTemplate = 'Armors';

                    scope.editMode = true;
                    setTimeout(function () { document.getElementById('editorItemName_input').focus(); }, 300);
                }
            };

            scope.iconManager = function() {
                var enchCount = 0,
                    qualities = ['', 'enhanced', 'magic', 'extra', 'legend'];
                if (!edt.item.unic && edt.item.type.length) {
                    angular.forEach(edt.item.enchants, function(ench) {
                        if (ench.label.length && ench.value) { enchCount++; }
                    });
                    edt.item.quality = qualities[enchCount]; // this will be used as model for coloring the item's title
                    var jb = '';
                    if (/^(amulet|weapondecoration|headarmor|shoulder|torso|glove|boot)/.test(edt.slot) || edt.item.type == 'shield') { jb = scope.selectedJob; }
                    edt.item.icon = edt.item.type + '45' + jb + qualities[enchCount];
                }
            };

            edt.onTypeSelect = function(type) {
                if (/orb|shield/.test(type)) {
                    edt.BaseTemplate = 'Shields';
                    edt.item.basestats[1] = { label: 'blockratebase', value: 0 };
                    edt.item.basestats[2] = { label: 'blockeddmgbase', value: 0 };
                } else if (/book|quiver|wrench/.test(type)) {
                    edt.BaseTemplate = 'Attack';
                    edt.item.basestats = [{ label: 'armorbase', value: 0 },{ label: 'critratebase', value: 0 }];
                } else if (/longbow|staff|rifle|greatsword|greataxe|hammer/.test(type)) {
                    edt.item.TwoHandedWeapon = true;
                } else if (edt.slot=='weapons') {
                    edt.item.TwoHandedWeapon = false;
                }
            };

            // auto-fills editor fields with selected item from database
            edt.onItemSelect = function (selected) {
                if (selected) {
                    edt.item.enchants = [{ label: '', value: 0 }, { label: '', value: 0 }, { label: '', value: 0 }, { label: '', value: 0 }];
                    edt.item.hashkey = selected.originalObject.hashkey;
                    edt.item.name = selected.originalObject.name;
                    edt.item.unic = selected.originalObject.unic;
                    edt.item.icon = selected.originalObject.icon;
                    if (/weapons|offhands/.test(edt.slot)) { edt.item.type = selected.originalObject.type; }
                    edt.onTypeSelect(edt.item.type);
                    var idx = 0;
                    angular.forEach(selected.originalObject, function (value, key) {
                        if (/base$/.test(key)) {
                            edt.item.basestats.some(function (v) {
                                if (v.label == key) { v.value = value; return true; }
                            });
                        }
                        else if (!/hashkey|unic|name|icon|type|level/.test(key)) {
                            edt.item.enchants[idx] = {'label':key, 'value':value}; idx++;
                        }
                    });
                    edt.item.reqlvl = selected.originalObject.level;
                    setTimeout(function () {
                        document.getElementById('editor').getElementsByTagName('button')[0].focus();
                    }, 300);
                }
            };

            edt.save = function () {
                if (!angular.equals(edt.item, equipsFactory.get('defaultSlots')[edt.slot]) && (edt.item.name == '' || (edt.item.type == '' && !/weapons|offhands/.test(edt.slot)))) {
                    alert(scope.db.sysmess['NameTypeRequired']);
                }
                else {
                    equipsFactory.reset(edt.slot);
                    equipsFactory.put(edt.slot, edt.item);
                    scope.equipIcon(edt.slot);
                    scope.updateGlobalStats(edt.slot);
                    edt.cancel();
                }
            };

            edt.cancel = function () {
                scope.editMode = false;
                edt.item = angular.copy( equipsFactory.get('defaultSlots')[edt.slot] );
                edt.slot = '';
                edt.dbtype = '';
                document.getElementById('editorItemName_input').value = '';
                edt.BaseTemplate = '';
            };

            edt.reset = function () {
                edt.item = angular.copy( equipsFactory.get('defaultSlots')[edt.slot] );
                document.getElementById('editorItemName_input').value = edt.item.name;
            };

            edt.kp = function (e) {
                if (e.keyCode == '13' && e.target.nodeName != 'BUTTON') { edt.save(); } //enter
                else if (e.keyCode == '27') { edt.cancel(); } //escape
            };
        }
    };
}]);

DrakenOptimApp.directive("fileread", [function () {
    return {
        scope: true,
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                var input, files, fr;

                files = changeEvent.target.files;

                if (typeof window.FileReader !== 'function') {
                    alert("The file API isn't supported on this browser yet."); return; }

                if (!files) { alert("This browser doesn't seem to support the `files` property of file inputs."); }
                else if (!files[0]) { alert("Please select a file before clicking 'Load'"); }
                else {
                    fr = new FileReader();
                    fr.readAsText(files[0]);
                    fr.onload = receivedText;
                }

                function receivedText(e) {
                    var newArr = JSON.parse( e.target.result );
                    scope.loadProfile(newArr);
                }
            });
        }
    }
}]);

DrakenOptimApp.directive('ngRightClick', ['$parse', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
}]);

DrakenOptimApp.directive('gemSelector', function () {
    return {
        scope: true,
        templateUrl: 'gemSelector.html'
    }
});

//for enc.label
DrakenOptimApp.directive('ngLabelboost', function () {
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, ngModelController) {
            ngModelController.$parsers.push(function(viewValue) {
                //convert data from view format to model format
                var t = scope.editor.item.enchants[scope.$index].value;
                if (viewValue.length && !/boost$|speed|damagepv/.test(viewValue) && Math.abs(t)<=2) { return viewValue + 'boost'; }
                return viewValue; //converted
            });

            ngModelController.$formatters.push(function(modelValue) {
                //convert data from model format to view format
                if (!/weapondamageboost|critboost|itemarmorboost/.test(modelValue)) {
                    return modelValue.replace('boost',''); }
                return modelValue; //converted
            });
        }
    }
});

// for enc.value
DrakenOptimApp.directive('ngPercentage', function () {
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, ngModelController) {
            ngModelController.$parsers.push(function(viewValue) {
                //convert data from view format to model format
                if (/%/.test(viewValue) || Math.abs(viewValue)<=2) {
                    if (angular.isDefined(scope.$index)) {
                        var t = scope.editor.item.enchants[scope.$index].label;
                        if (!/boost$|speed|damagepv/.test(t)) {
                            scope.editor.item.enchants[scope.$index].label = t + 'boost'; }
                    }
                    if (/%/.test(viewValue)) {
                        return parseFloat(viewValue.replace(',','.').replace('%',''))/100;
                    } else return parseFloat(viewValue.replace(',','.'));
                }
                else if (angular.isDefined(scope.$index)) {
                    var t = scope.editor.item.enchants[scope.$index].label;
                    if (/boost$/.test(t) && !/weapondamageboost|critboost|itemarmorboost/.test(t)) {
                        scope.editor.item.enchants[scope.$index].label = t.replace('boost',''); }
                }
                return parseFloat(viewValue); //converted
            });

            ngModelController.$formatters.push(function(modelValue) {
                //convert data from model format to view format
                if (Math.abs(modelValue)<=2) {return modelValue*100+'%';}
                return modelValue; //converted
            });
        }
    }
});

DrakenOptimApp.directive('ngTooltip', ['equipsFactory', '$filter', function (equipsFactory,$filter) {
    return {
        restrict: 'A',
        scope: true,
        templateUrl: 'ngTooltip.html',
        link: function (scope, elem, attrs) {
			
            var tt = elem[0].firstElementChild, // .Tooltip
                ttarrow = tt.firstElementChild,
                ttinner = tt.lastElementChild,
                tablerows = ttinner.children[0].children;
            tt.id = elem[0].id + 'Tooltip';
            angular.element(document.body).append(tt);

            // Tooltip & Tootltip-arrow horizontal placements
            if (/^Left/.test(elem[0].parentNode.id)) {
                ttarrow.classList.add('Tooltip-arrow-left');
                ttarrow.classList.add('floatL');
                ttinner.classList.add('floatR');
            } else {
                ttarrow.classList.add('Tooltip-arrow-right');
                ttarrow.classList.add('floatR');
                ttinner.classList.add('floatL');
            }

            elem.bind('mouseover', function(event) {
                var slot = event.target.attributes.id.value,
                    sl = equipsFactory.get(slot);

                if ( !angular.equals(sl, equipsFactory.get('defaultSlots')[slot]) ) {
                    var ench = '', gems = '', bst = '';
                    angular.forEach(sl.basestats, function (b) {
                        bst += scope.db.sysmess[b.label] + ' ' + (b.label=='speedbase' ? $filter('number')(b.value,3) : b.value);
                        bst += b.label!='damageminbase'?'<br/>':'';
                    });
                    angular.forEach(sl.enchants, function (enc) {
                        var sign = '', lb = enc.label;
                        if (enc.value && enc.label.length) {
                            if (!/^-/.test(enc.value)) { sign='+'; }
                            if (!/weapondamageboost|critboost|itemarmorboost/.test(enc.label)) { lb = enc.label.replace('boost',''); }
                            ench += scope.db.sysmess[lb] + ' ' + sign + $filter('percentage')(enc.value,1) + '<br/>';
                        }
                    });
                    angular.forEach(sl.gems, function (g) {
                        if (g.key!='nogem') {
                            var dbgem = $filter('findByPropertyValue')(scope.db.gems,'key',g.key);
                            angular.forEach(dbgem,function(v,k) {
                                if (!/name|key|icon|slots|category/i.test(k)) {
                                    if (v < 1) { v = v * 100 + '%'; }
                                    gems += "<img src='Images/" + dbgem.icon + ".png'/>" + scope.db.sysmess[k] + ' + ' + v + "<br/>";
                                }
                            });
                        }
                    });
                    var t = '(' + scope.db.sysmess['Type_' + sl.type];
                    if (slot == 'weapons') {
                        if (sl.TwoHandedWeapon) { t = '(' + scope.db.sysmess['Type_2H']; }
                        else { t = '(' + scope.db.sysmess['Type_1H']; }
                        t += ', ' + scope.db.sysmess[sl.type];
                    } else if (slot == 'offhands') { t = '(' + scope.db.sysmess[sl.type]; }
                    t += ')';
                    
                    var titleColor = '';
                    if (sl.unic) { titleColor = 'yellow'; }
                    else if (sl.quality == 'enhanced') { titleColor = 'green'; }
                    else if (sl.quality == 'magic') { titleColor = 'blue'; }
                    else if (sl.quality == 'extra') { titleColor = 'purple'; }
                    else if (sl.quality == 'legend') { titleColor = 'orange'; }

                    // populate the template with above built contents
                    var tc0 = tablerows[0].cells[0];
                    tc0.classList.remove( tc0.classList[1] );
                    if (titleColor.length) { tc0.classList.add(titleColor); }
                    tc0.innerHTML = sl.name;
                    tablerows[1].cells[0].innerHTML = t;
                    tablerows[2].cells[0].innerHTML = bst;
                    tablerows[3].cells[0].innerHTML = ench;
                    tablerows[4].cells[0].innerHTML = gems;
                    tablerows[5].cells[0].lastElementChild.innerHTML = sl.reqlvl;

                    tt.style.display = "block";
                    // next properties can be resolved only after tooltip is displayed
                    if (/^Right/.test(elem[0].parentNode.id)) { tt.style.left = elem[0].offsetLeft - tt.offsetWidth - 4 + "px"; }
                    else { tt.style.left = elem[0].offsetLeft + elem[0].offsetWidth + 4 + "px"; }
                    tt.style.top = elem[0].offsetTop + (elem[0].offsetHeight - tt.offsetHeight) / 2 + "px";
                    ttarrow.style.marginTop = ttinner.offsetHeight / 2 - 15 + "px";
                }
            });
            elem.bind('mouseleave', function(event) {
                var slot = event.target.attributes.id.value;
                document.getElementById(slot+'Tooltip').style.display = "none";
            });
        }
    }
}]);