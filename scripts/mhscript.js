$( document ).ready(function() {
		initHelixDB();
		definePersistenceMigrations();
		Helix.DB.initPersistence();
		$("body").css("overflow", "hidden");
		
		var stateManager = {
			thread_id: null,
			user: null,
			msg_to: null,
			chatListInit: 0,
			lastsyncmsgid: 0,
			offline: false
		};
		
		var messagelist, threadlist;
		
		$(document).on('pageshow', '#login-page', function(){
			console.log ("state manager cleared");
			stateManager = {
				thread_id: null,
				user: null,
				msg_to: null,
				chatListInit: 0,
				lastsyncmsgid: 0,
				offline: false
			};
		});

		$(document).on('pageinit', '#login-page', function(){ 
			//offline status
			$('.onlinebutton').show();
			 $(document).on('click', '.onlinebutton', function(){
				goOnline();
				$.mobile.changePage("#login-page"); 			
			 });
			 $(".ui-icon-loading").hide();
		});	
		$(document).on('pageinit', '#thread-page', function(){ 
			$(".ui-icon-loading").show();
			var s = Helix.DB.getSchemaForTable("Thread");
			threadlist = $('#myThreadsList').helixDatalist({
				headerText: "Chat Threads - Mobile Helix Datalist" ,
				emptyMessage: "There are no items to display.",
				itemList: null,
				condition: s,
				rowRenderer: function(parentDiv, list, row) {
					var other="";
					if ( row.thread_user1 == stateManager.user )
						other = row.thread_user2;
					else
						other = row.thread_user1;
					var markup = $('<div class="chat_thread" id="' + row.thread_id + '"/>').append(
						"<img src='images/" + other + ".jpg' />" ).append(
						"&nbsp;&nbsp;&nbsp; <b> " +  other + "</b></li>" );
					list.createListRow(parentDiv, { body: markup });
					return true;
				}
			});

			
			 $(document).on('click', '.chat_thread', function(){
				stateManager.thread_id = $(this).attr('id');
				$.mobile.changePage("#chat-page"); 			
			 });
			 
			 $(document).on('click', ".special-msg-ops", function(){
				$(this).attr('id')
				add_messages( $(this).attr('id') );
			 });
			 $(document).on('click', "#logout", function(){
				$.mobile.changePage("#login-page"); 			
			 });
		});	
		
		$(document).on('pageinit', '#chat-page', function(){ 
			var s = Helix.DB.getSchemaForTable("Message");
			messagelist = $('#myMessageList').helixDatalist({
				headerText: "Messages window - Mobile Helix Datalist" ,
				emptyMessage: "There are no items to display.",
				itemList: null, 
				itemsPerPage: 75,
				condition: s,
				rowRenderer: function(parentDiv, list, row) {
					var markup = $('<div />').append(
						"<img src='images/" + row.msg_from + ".jpg' />" ).append(
						row.created + ":&nbsp;&nbsp;&nbsp; <b> " +  row.message + "</b></li>" );
					list.createListRow(parentDiv, { body: markup });
					return true;
				}
			});
			
			$(document).on('click', '#back_button', function(){				
				$.mobile.changePage("#thread-page"); 			
			});

		});
		$(document).on('pageshow', '#chat-page', function(){ 
			
			getMessages( );
				
		});	
		$(document).on('pageshow', '#thread-page', function(){ 
			
			getThreads( );
				
		});
		
		$(document).on('hxPersistenceReady', function () {
			$(".ui-icon-loading").show();
			var users = {
				__hx_schema_name: "User",
				uid: '1',
				user: 'empty',
				__hx_key: "uid",
				__hx_sorts:{},
				__hx_filters:{},
				__hx_global_filters:{},
				__hx_text_index:[]
			};
			
			var messages = {
					__hx_schema_name: "Thread",
					Message: [{
						__hx_schema_name: "Message",
						message_id: '1',
						thread_id: '1',
						msg_to: 'empty',
						msg_from: 'empty',
						message: 'empty',
						created: 'empty',
						__hx_key: "message_id",
						__hx_sorts:{},
						__hx_filters:{},
						__hx_global_filters:{},
						__hx_text_index:[]
					}],
					thread_id: '1',
					thread_user1: 'empty',
					thread_user2: 'empty',
					created: 'empty',
					modified: 'empty',
					__hx_key: "thread_id",
					__hx_sorts:{'created' : 'message date'},
					__hx_filters:{},
					__hx_global_filters:{},
					__hx_text_index:[]
			};
			
			//var schema = Helix.DB.prepareSchemaTemplate(messages, "Chats", "thread_id", {}, {});			
			Helix.DB.generatePersistenceSchema(messages, "Thread", function () {
					persistence.dump(function (dump) {
						console.log(dump);
						//var schema1 = Helix.DB.prepareSchemaTemplate(users, "Users", "uid", {}, {});
						Helix.DB.generatePersistenceSchema(users, "User", function () {
							persistence.dump(function (dump) {
								console.log(dump);
								$(document).on('click', '#login-btn', function() {
									logmein();
								});
								$.mobile.changePage("#login-page"); 			
								$(".ui-icon-loading").hide();
							});
						
						});
					});
				});	
			
		});
		
		
		function loginOfflineUser(){
			var u = $("#username").val();
			if ( u === "" ){
				alert ( "you must enter a username" );
				$(".ui-icon-loading").hide();
				return;
			}
			var s = Helix.DB.getSchemaForTable("User");
			Helix.DB.loadAllObjects( s, function(obj){
				var u = $("#username").val();
				obj.filter( 'user', 'like', u).newEach( {
					eachFn: function(elem) { 
						console.log ("offline user: " + elem.user);
						stateManager.user = elem.user;
						goOffline();
						$.mobile.changePage("#thread-page"); 
					},
					doneFn: function(ct) {
						//console.log(ct);
					},
					startFn: function(ct) {  
						if (ct == 0)
							alert("invalid user for offline use");
					}
				});
				$(".ui-icon-loading").hide();
			});
		}
		
		function goOffline(){
			stateManager.offline = true;
			$('.onlinebutton').show();
		
		}
		
		function goOnline(){
			stateManager.offline = false;
			$('.onlinebutton').hide();
		
		}
		
		function add_messages( opp ){
			$.ajax({
			  //type: "POST",
			  dataType: 'jsonp',
			  url: 'http://link-sdkdemo1.rhcloud.com/messages/' + opp,
			  data: {
				Message: {
					special: 500
				}
			  },
			  success: function(data){
				console.log ( $.parseJSON(data) );
				$.mobile.changePage("#login-page"); 			
				goOnline();
			  }	
			});
		}

		function logmein() {
			
			$.ajax({
			  //type: "POST",
			  dataType: 'jsonp',
			  url: 'http://link-sdkdemo1.rhcloud.com/users/loggedin',
			  data: {
			  },
			  success: function(data){
				window.d3 = $.parseJSON(data);
				var d = $.parseJSON(data);
				if (d.success === true ){
					var s = Helix.DB.getSchemaForTable("User");
					Helix.DB.synchronizeObject(d.payload, s, function(persistentObj) {
						window.d = persistentObj;
						console.log(persistentObj);
						$(".ui-icon-loading").hide();
						//alert('that worked');
						stateManager.user = d.payload.user;
						goOnline();
						$.mobile.changePage($("#thread-page")); 		

					});
								
				} else{
					var user = $("#username").val();
					if ( user === "" ){
						alert ( "you must enter a username" );
						$(".ui-icon-loading").hide();
						return;
					}
					if ( password === "" ){
						alert ( "you must enter a password" );
						$(".ui-icon-loading").hide();
						return;
					}
					
					$.ajax({
					  //type: "POST",
					  dataType: 'jsonp',
					  url: 'http://link-sdkdemo1.rhcloud.com/users/login',
					  data: {
						User: {
						  username: $("#username").val(),
						  password: $("#password").val(),				  
						}
					  },
					  success: function(data){
						//alert('that worked');
						window.d3 = $.parseJSON(data);
						var d = $.parseJSON(data);
						if (d.success === true ) {
							stateManager.user = d.payload.user;
							goOnline();
							$.mobile.changePage("#thread-page"); 			
							
						}
						else {}
					  },
					  error: function(data){
						console.log(data);
						$('#password').val("");
						loginOfflineUser();
					  }
					});
				
				}
					
			  },
			  error: function(data){
				console.log(data);
				$('#password').val("");
				loginOfflineUser();
			  }
			});

		}
		
		function fetchOnlineThreads(){
			// ok, now let's see if we can get new stuff from the server:
			$.ajax({
				  //type: "POST",
				  dataType: 'jsonp',
				  url: 'http://link-sdkdemo1.rhcloud.com/threads/index',
				  data: "",
				  success: function(data){
					goOnline();
					var d = $.parseJSON(data);
					if (d.message === "thread data"){
						var s = Helix.DB.getSchemaForTable("Thread");
						Helix.DB.synchronizeObject(d.payload, s,function(persistentObj) {
							window.d = persistentObj;
							console.log("threads synchronized");
							threadlist.helixDatalist( "refreshData", persistentObj, s, function(){
								Helix.Layout.layoutPage(); 		
								$(".ui-icon-loading").hide();
							});
							},null,null,null
						)
					}
				},
				error: function(data){
					console.log(data);
					$(".ui-icon-loading").hide();
				}
			});
		}
		function getThreads() {
			$(".ui-icon-loading").show();
			// make sure we have a valid user
			if ( stateManager.user == null ){
				$.mobile.changePage("#login-page"); 			
				return;
			}
			
			// first, load what we have
			var s = Helix.DB.getSchemaForTable("Thread");
			Helix.DB.loadAllObjects( s, function(obj){
				if (obj){
					threadlist.helixDatalist( "refreshData", obj, s, function(){
						Helix.Layout.layoutPage(); 
						$(".ui-icon-loading").show();
						console.log ( "refreshData for threadlist" );
						fetchOnlineThreads();	 
					});
				} else {
					console.log ("offline thread get failed");
					fetchOnlineThreads();
				}
			});
			
		}

		function confirmSync(lastMsgId){
			$.ajax({
				//type: "POST",
				dataType: 'jsonp',
				url: 'http://link-sdkdemo1.rhcloud.com/threads/lastsynchok',
				data: {
					thread_id: stateManager.thread_id,
					lastsyncmsgid: lastMsgId
				},
				success: function(data){
					goOnline();
					var d = $.parseJSON(data);
					if (d.message === "lastsyncmsgid"){
						stateManager.lastsyncmsgid = d.payload;
					} 
				}
			});
		
		}
		function getMessages(  ) {
			$(".ui-icon-loading").show();
			// first make sure we have a thread selected
			if ( stateManager.thread_id == null ){
				$.mobile.changePage("#thread-page"); 			
				return;
			}
			// first we load up what we have
			var s = Helix.DB.getSchemaForTable("Thread");
			console.log("fetching offline messages.");
			Helix.DB.synchronizeObjectByKey( stateManager.thread_id, s, function(obj){
				messagelist.helixDatalist( "refreshList", obj.Message, s, s, function(){
					Helix.Layout.layoutPage(); 
					// now we try to reach out to the server
					$.ajax({
						//type: "POST",
						dataType: 'jsonp',
						url: 'http://link-sdkdemo1.rhcloud.com/threads/view/',
						data: {
							thread_id: stateManager.thread_id,
							last_msg: stateManager.lastsyncmsgid
						},
						success: function(data){
							window.d3 = $.parseJSON(data);
							var d = $.parseJSON(data);
							if (d.message === "thread data"){
								var s = Helix.DB.getSchemaForTable("Message");
								Helix.DB.synchronizeObject(d.payload.Message, s,function(persistentObj) {
									window.d = persistentObj;
									console.log("threads synchronized");
									messagelist.helixDatalist( "refreshData", persistentObj, s, function(){
										confirmSync(d.payload.Message[ d.payload.Message.length - 1].message_id);
									});
									},null,null,null
								);
								
							}
						}, error: function(data){
							console.log(data);
						}
						
					});	
				 });
			});
			$(".ui-icon-loading").hide();			
		}

		function send( ) {
			var m = {
				Message:{
					thread_id: stateManager.thread_id,
					message: document.getElementById('messagebox').value,
					msg_from: stateManager.user,
					msg_to: stateManager.msg_to
				}
			};
			$.ajax({
				 //type: "POST",
				 dataType: 'jsonp',
				 url: 'http://link-sdkdemo1.rhcloud.com/messages/add',
				 data: m,
				success: function(data){
					$("#messagebox").val("");
					//print();
					//alert('that worked');
					window.d3 = $.parseJSON(data);
					var d = $.parseJSON(data);
					getMessages( stateManager.thread_id );
				}
			});	  
			

		}


		function print() {
		var record;
			Helix.DB.synchronizeObjectByKey(2/*document.getElementById('IDbox').value*/, Helix.DB.getSchemaForTable("threadTable"), function (obj) {
				record = obj.Message;
				$('#chatwindow').append(JSON.stringify(record) + "<br />");
				var m = {
					thread_id: 2,
					Message: JSON.stringify(record)
				};
				Helix.DB.synchronizeObject(m,
					Helix.DB.getSchemaForTable("threadTable"),
					function () {
						//alert(JSON.stringify(m));
					},
					null, null, null
				);
			});
		}
		
		function delta() {
			Helix.DB.generatePersistenceSchema({
			__hx_schema_name: 'threadTable',
			__hx_key : 'threadCount',
			Message : ''},
			'TestSchemaGen', function() {// Schema is ready. Now add to it.
				m = {
					"adds":[{
					'Message':document.getElementById('deltabox').value
					}],
					"updates":{},
					"deletes":{}
				};
				alert(JSON.stringify(m));
				
				Helix.DB.synchronizeDeltaObject(
					m,
					Helix.DB.getSchemaForTable("threadTable"),
					function () {
						//alert(JSON.stringify(m));
					},
					null, null, null
				);
				print();
			})
		}
		
		function backToThreads(){
			$.mobile.changePage("#thread-page"); 			
			
		}
		
		
	});
