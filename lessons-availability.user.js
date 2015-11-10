// ==UserScript==
// @name         lessons-availability
// @namespace    http://namal.ovh
// @version      2.0
// @description  Adds availabilities of every lesson.
// @author       Namal
// @match        http://www.polymtl.ca/etudes/cs/*/maitrise.php
// @grant        none
// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @require		 https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.core.min.js
// @require		 https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.buttons.min.js
// ==/UserScript==

/**
  Author: Namal
 **/
jQuery( document ).ready(function( $ ) {

	function dataToString(data){
		return '<td>'+data+'</td>';
	}

	var notice = new PNotify({
		title : 'Progress',
		text : 'Test',
		hide: false
	});
	var queue=[];
	function updateNotice(){
		var num=0;
		for(var i=0;i<queue.length;i++){
			if(queue[i].progress==100)
				num++	
		}
		var obj = {text:Math.floor(num/queue.length*100)+"%"}
		if(num==queue.length){
			obj.type = 'success';
			setTimeout(function(){
				notice.remove();
			},3000);
		}
		notice.update(obj);
	}
	
	var tables = $('table'); /* get all tables */

	/* filter tables about programm structure */
	for(var i=0;i<tables.length;i++){
		if($(tables[i]).find('a').length){
			tables = tables.slice(i); 
			break;
		}
	}

	if(tables.length){
		$('<link href="https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.core.min.css" media="all" rel="stylesheet" type="text/css" />').appendTo('head');
		$('<link href="https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.brighttheme.min.css" media="all" rel="stylesheet" type="text/css" />').appendTo('head');
		$('<link href="https://cdnjs.cloudflare.com/ajax/libs/pnotify/2.1.0/pnotify.buttons.min.css" media="all" rel="stylesheet" type="text/css" />').appendTo('head');
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
							$(this).append(dataToString(lessons[sigle].data));
						}else{
							/* we wait till de data has been retrieved */
							if(!lessons[sigle].wait){
								lessons[sigle].wait=[];
							}
							lessons[sigle].wait.push($(this));
						}
					}else{
						lessons[sigle]={};
						var test = {sigle:sigle,progress:0};
						queue.push(test);
						updateNotice();
						$.ajax({
							url: 'http://www.polymtl.ca/etudes/cours/details.php?sigle='+sigle,
							type: 'GET',
							datatype:'html',
							context:this,
							xhr: function(){
								var xhr = new window.XMLHttpRequest();
								/*
								//Upload progress
								xhr.upload.addEventListener("progress", function(evt){
									if (evt.lengthComputable) {
										var percentComplete = evt.loaded / evt.total;
										//Do something with upload progress
										console.log(percentComplete);
									}
								}, false);*/
								//Download progress
								xhr.addEventListener("progress", function(evt){
									if (evt.lengthComputable) {
										var percentComplete = evt.loaded / evt.total;
										test.progress=percentComplete;	
										updateNotice();
										//Do something with download progress
									}
								}, false);
								return xhr;
							},
							success : function(html,status){
								/* last table has availabilities */
								test.progress = 100;
								updateNotice();
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
								$(this).append(dataToString(lessons[sigle].data));
								$('a[name="'+sigle+'"]').parent().append(" "+data);

								if(lessons[sigle].wait){
									for(i=0; i<lessons[sigle].wait.length;i++){
										tr = lessons[sigle].wait.pop();
										$(tr).append(dataToString(lessons[sigle].data));
									}
								}
							}
						});
					}
				}
			});
		});
	}
})
