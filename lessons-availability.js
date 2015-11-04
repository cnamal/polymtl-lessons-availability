// ==UserScript==
// @name         lessons-availability
// @namespace    http://namal.ovh
// @version      1.0
// @description  Adds availabilities of every lesson.
// @author       Namal
// @match        http://www.polymtl.ca/etudes/cs/*/maitrise.php
// @grant        none
// ==/UserScript==

/**
   Author: Namal
**/
jQuery( document ).ready(function( $ ) {

    var tables = $('table'); /* get all tables */

	/* filter tables about programm structure */
    for(var i=0;i<tables.length;i++){
        if($(tables[i]).find('a').length){
            tables = tables.slice(i); 
            break;
        }
    }

    var lessons={};

    tables.each(function(){
        $(this).find('tr').each(function(index){
            if(!index)
                $(this).append('<th>AHE</th>'); 
            else{
                var sigle =$(this).find('a').attr('href').slice(1);
                if(lessons[sigle]){
                    if(lessons[sigle].data){
						/* data has already been retrieved */
                        $(this).append('<th>'+lessons[sigle].data+'</th>');
                    }else{
						/* we wait till de data has been retrieved */
                        if(!lessons[sigle].wait){
                            lessons[sigle].wait=[];
                        }
                        lessons[sigle].wait.push($(this));
                    }
                }else{
                    lessons[sigle]={};
                    $.ajax({
                        url: 'http://www.polymtl.ca/etudes/cours/details.php?sigle='+sigle,
                        type: 'GET',
                        datatype:'html',
						success : function(html,status){
							/* last table has availabilities */
                            var table = $(html).find('table');
                            var len = table.length;
                            var available = $(table[len-1]).find('tr');
                            var tr = available[available.length-1];
                            var td = $(tr).find('td');
                            var data = "";

							/* we only show availabilities for current year */
                            for (var i=0;i<3;i++){
                                data+=$(td[i]).text().charAt(0);
                            }
                            lessons[sigle].data=data;
                            $(this).append('<th>'+lessons[sigle].data+'</th>');
                            $('a[name="'+sigle+'"]').parent().append(" "+data);
                            if(lessons[sigle].wait){
                                for(i=0; i<lessons[sigle].wait.length;i++){
                                    var tr = lessons[sigle].wait.pop();
                                    $(tr).append('<th>'+lessons[sigle].data+'</th>');
                                }
                            }
                        }.bind(this)
                    });
                }
            }
        });
    });
})
