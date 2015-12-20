// ==UserScript==
// @name         lessons-availability
// @namespace    http://namal.ovh
// @version      3.0
// @description  Adds availabilities of every lesson.
// @author       Namal
// @match        http://www.polymtl.ca/etudes/cs/*/maitrise.php
// @grant        none
// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @require		 https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.core.min.js
// @require		 https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.buttons.min.js
// @require      https://ajax.googleapis.com/ajax/libs/angularjs/1.4.5/angular.min.js
// @require      https://ajax.googleapis.com/ajax/libs/angularjs/1.4.5/angular-sanitize.min.js
// ==/UserScript==

/**
 Author: Namal
 **/
jQuery( document ).ready(function( $ ) {

    // progress notice
    var notice = new PNotify({
        title : 'Progress',
        text : '{{progress()}}%',
        hide: false
    });

    var tables = $('table'); /* get all tables */

    /* filter tables about program structure */
    for(var i=0;i<tables.length;i++){
        if($(tables[i]).find('a').length){
            tables = tables.slice(i);
            break;
        }
    }

    var tableAll=[];
    var nbLessons=0;
    if(tables.length){
        $('<link href="https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.core.min.css" media="all" rel="stylesheet" type="text/css" />').appendTo('head');
        $('<link href="https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.brighttheme.min.css" media="all" rel="stylesheet" type="text/css" />').appendTo('head');
        $('<link href="https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.buttons.min.css" media="all" rel="stylesheet" type="text/css" />').appendTo('head');
        var lessons={};


        var body = $('body');
        body.attr('ng-app','PolyApp');
        body.attr('ng-controller','PolyCtrl');

        //add inputs before the tables
        $($(tables[0]).siblings('h1')[0]).before('<select ng-model="yearSelected" ng-change="updateYear()"ng-options="yr as yr.name for yr in years" ng-disabled="selectDisable"></select><span ng-repeat="sess in sessions" ng-if="yearSelected.value!=\'all\'"><input type="checkbox"   ng-model="sess.value" ng-disabled="selectDisable"/>{{sess.name}}</span>');

        tables.each(function(tableIndex){// for each table (sub domains of a speciality)
            $(this).find('tr').each(function(index) {//for each row of a table
                if (!index) { //first row -> column names
                    $(this).append('<th ng-repeat="yr in year">{{yr.name}}<br/>AHE</th>');
                    $(tables[tableIndex]).find('tbody').append('<tr ng-repeat="sigle in tables['+tableIndex+']|available:this" ng-class-even="\'tableAlternateRow\'"><td ng-repeat="html in lessons[sigle].html track by $index" ng-bind-html="html"></td><td ng-repeat="yr in year">{{lessons[sigle].av[yr.value]}}</td></tr>');
                    tableAll[tableIndex]=[];
                }else{
                    var line=[];
                    var sigle="";
                    $(this).find('td').each(function(index){ //for each column
                        line[index] = $(this).html();
                        if(index==1) // 2nd column is the course ID
                            sigle=$(this).find('a').attr('href').slice(1);
                    });

                    if(!lessons[sigle]){
                        lessons[sigle]={};
                        lessons[sigle].html=line;
                        lessons[sigle].av=[];
                        nbLessons++;
                    }
                    $(this).remove();
                    tableAll[tableIndex].push(sigle);
                }
            });//end row
        }); // end table

        angular.module('PolyApp',['ngSanitize'])
            .filter('available',function(){
                return function(sigles,$scope){
                    return sigles.filter(function(sigle){//filter out unavailable lessons
                        var yr =$scope.yearSelected;
                        if(yr.value=="all"){
                            return true;
                        }
                        var sess = $scope.sessions;
                        for(var i=0;i<3;i++){
                            if(sess[i].value && lessons[sigle].av[yr.value].charAt(i)!="-"){
                                return true;
                            }
                        }
                        return false;
                    });
                }
            })
            .controller('PolyCtrl',function($scope,$http){

                //variables
                $scope.years=[{value:"all",name:"Toutes les années"}];
                $scope.yearSelected = $scope.years[0];
                $scope.year=[];
                $scope.lessons=lessons;
                $scope.tables = tableAll;
                $scope.completed=0;
                $scope.nbLessons=nbLessons;
                $scope.selectDisable=false;
                $scope.sessions=[{value:true,name:"Automne"},{value:true,name:"Hiver"},{value:true,name:"Ete"}];

                //callback functions
                $scope.updateYear=function(){
                    var yr = $scope.yearSelected;
                    if(yr.value=="all"){
                        $scope.year=$scope.years.slice(1);
                    }else{
                        $scope.year=[yr];
                    }
                };
                $scope.progress=function(){
                    if($scope.completed==$scope.nbLessons){
                        notice.update({type:'success'});
                        setTimeout(function(){
                            notice.remove();
                        },3000);
                        $scope.selectDisable=false;
                    }
                    return Math.floor($scope.completed/$scope.nbLessons*100);
                };

                $scope.selectDisable=true;
                // get availabilities !
                for(var sigle in lessons){
                    (function(sigle){
                        $http.get('http://www.polymtl.ca/etudes/cours/details.php?sigle='+sigle).then(
                            function(res){

                                var table = $(res.data).find('table');
                                var len = table.length;
                                var available = $(table[len-1]).find('tr'); //rows of table with availabilities

                                if(!available.length){ //some lessons don't even exist ! Genius !
                                    delete lessons[sigle];
                                    tableAll.forEach(function(e,i){
                                        if(e.indexOf(sigle) !== -1) {
                                            e.splice(e.indexOf('c'), 1);
                                        }
                                    });
                                    new PNotify({
                                        title : 'Cours supprimé',
                                        type :'error',
                                        text : '<a href="http://www.polymtl.ca/etudes/cours/details.php?sigle='+sigle+'">'+sigle+'</a> ne semble pas être un cours valide ! Il a été supprimé des listes',
                                        hide: false
                                    });
                                    $scope.nbLessons--;
                                    return;
                                }

                                $scope.completed++;

                                available.each(function(index){ // for each row
                                    if($scope.years.length==1 && !index){//JS is not multithread so this works
                                        $(this).find('th').each(function() {//for each column -> a year
                                            var tmp = {value: $(this).text().substring(0, 4), name: $(this).text()};
                                            $scope.years.push(tmp);
                                            $scope.updateYear();
                                        });
                                    }else if(index==2){ // finally, we process the availabilities
                                        var td = $(this).find('td');
                                        var data = "";


                                        for (var i=0;i<3*($scope.years.length-1);i++){
                                            data+=$(td[i]).text().charAt(0);
                                            if(i && (i+1)%3==0){
                                                var yr = $scope.years[(i+1)/3].value;
                                                lessons[sigle].av[yr]=data;
                                                data="";
                                            }
                                        }
                                    }
                                })
                            });
                    })(sigle);
                }
            });

        // create an injector
        var $injector = angular.injector(['ng','PolyApp']);

        // use the injector to kick off the application
        $injector.invoke(function($rootScope, $compile, $document) {
            $compile($document)($rootScope);
            $rootScope.$digest();
        });
    }
});
