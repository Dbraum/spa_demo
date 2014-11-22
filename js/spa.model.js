/*
 * spa.model.js
 * Model module
*/

/*jslint         browser : true, continue : true,
  devel  : true, indent  : 2,    maxerr   : 50,
  newcap : true, nomen   : true, plusplus : true,
  regexp : true, sloppy  : true, vars     : false,
  white  : true
*/

/*global $, spa */

spa.model = (function (){
    var
        configMap = { anon_id : 'a0' },
        stateMap  = {
            anon_user      : null,
            people_cid_map : {},
	        cid_serial : 0 ,
            people_db      : TAFFY(),
	        user : null
        },

        isFakeData = true,

        personProto, makeCid, clearPeopleDb, completeLogin,
	    makePerson, removePerson, people, initModule;


	// The people object API
	// ---------------------
	// The people object is available at spa.model.people.
	// The people object provides methods and events to manage
	// a collection of person objects. Its public methods include:
	//   * get_user() - return the current user person object.
	//     If the current user is not signed-in, an anonymous person
	//     object is returned.
	//   * get_db() - return the TaffyDB database of all the person
	//     objects - including the current user - presorted.
	//   * get_by_cid( <client_id> ) - return a person object with
	//     provided unique id.
	//   * login( <user_name> ) - login as the user with the provided
	//     user name. The current user object is changed to reflect
	//     the new identity. Successful completion of login
	//     publishes a 'spa-login' global custom event.
	//   * logout()- revert the current user object to anonymous.
	//     This method publishes a 'spa-logout' global custom event.
	//
	// jQuery global custom events published by the object include:
	//   * spa-login - This is published when a user login process
	//     completes. The updated user object is provided as data.
	//   * spa-logout - This is published when a logout completes.
	//     The former user object is provided as data.
	//
	// Each person is represented by a person object.
	// Person objects provide the following methods:
	//   * get_is_user() - return true if object is the current user
	//   * get_is_anon() - return true if object is anonymous
	//
	// The attributes for a person object include:
	//   * cid - string client id. This is always defined, and
	//     is only different from the id attribute
	//     if the client data is not synced with the backend.
	//   * id - the unique id. This may be undefined if the
	//     object is not synced with the backend.
	//   * name - the string name of the user.
	//   * css_map - a map of attributes used for avatar
	//     presentation.
	//

	// chat对象需要暴露的API
	// ---------------------
	//提供加入或者离开聊天室的方法
	//提供更换听者的方法
	//提供向其他人发送消息的方法
	//提供通知服务器用户更新了头像的方法
	//当听者不管是何原因而需要更改消息框的时候，发布一个事件。比如，假如用户发送或者接收消息
	//当不管是何原因而导致在线人员列表发送变化，比如，假如某人加入或者离开聊天室，或者任意用户移动了头像
	//jion() --加入聊天室。如果用户是匿名的，该方法应该终止并返回false
	//get_chatee() --返回正在与之聊天的person对象。如果没有听者，则返回null
	//set_chatee(<person_id>) --根据唯一的person_id，把person对象设置为听者。该方法应该发布spa-setchatee事件，携带的数据听者的
	//  信息。如果在线人员集合中找不到需要匹配的person对象，则把听者设置为null。如果请求的人员已经是听者，则返回false
	//send_message(<msg_text>) --想听者发送消息。应该发布spa-updatechat事件，携带的数据是消息信息。如果用户是匿名的或者听者为null
	//该方法应该不做操作并返回false
	//update_avatar(<update_avatar_map>) --更新person对象的头像信息。参数(<update_avatar_map>)应该包含person_id和css_map属性



    personProto = {
        get_is_user : function(){
            return this.cid === stateMap.user.cid ;
        },
        get_is_anon : function(){
            return this.cid === stateMap.anon_user.cid ;
        }
    } ;
	makeCid = function(){
		return "c" + String(stateMap.cid_serial++) ;
	};

	clearPeopleDb = function(){
		//添加一个方法，移除所有除匿名人员之外的person对象，如果已有用户登录，则当前用户要保留。
		var user = stateMap.user;
		stateMap.people_db      = TAFFY();
		stateMap.people_cid_map = {};
		if ( user ) {
			stateMap.people_db.insert( user );
			stateMap.people_cid_map[ user.cid ] = user;
		}
	};

	completeLogin = function(user_list){
	//当后端发送回用户的确认信息和数据时，完成用户的登录。这段程序会更新当前用户信息，然后发布登入成功的sap_login事件
		var user_map = user_list[ 0 ];
		delete stateMap.people_cid_map[user_map.cid] ;
		stateMap.user.cid     = user_map._id;
		stateMap.user.id      = user_map._id;
		stateMap.user.css_map = user_map.css_map;
		stateMap.people_cid_map[ user_map._id ] = stateMap.user;

		// When we add chat, we should join here
		$.gevent.publish( 'spa-login', [ stateMap.user ] );
	};
	makePerson = function(person_map){
		var person ,
			cid     = person_map.cid,
			css_map = person_map.css_map,
			id      = person_map.id,
			name    = person_map.name;

		if(!cid || !name){
			throw 'client id and name required';
		}

		person         = Object.create( personProto );
		person.cid     = cid;
		person.name    = name;
		person.css_map = css_map;

		if(id){
			person.id = id;
		}

		stateMap.people_cid_map[cid] = person ;
		stateMap.people_db.insert( person );
		return person ;
	};
    removePerson = function(person){
	//创建从人员列表中移除person对象的方法。我们添加了一些检查，避免逻辑不一致，比如，不会移除当前用户和匿名的person对象
	    if(person) return false ;

	    if ( person.id === configMap.anon_id ) {
		    return false;
	    }

	    stateMap.people_db({ cid : person.cid }).remove();
	    if ( person.cid ) {
		    delete stateMap.people_cid_map[ person.cid ];
	    }
	    return true;
    };
	people = (function(){
		var get_by_cid,get_db,get_user,login,logout ;

		get_by_cid = function(cid){
			return stateMap.people_cid_map[cid] ;
		};

		get_db = function(){
			return stateMap.people_db ;
		};

		get_user = function(){
			//返回当前用户person对象
			return stateMap.user ;
		};

		login = function(name){
			var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

			stateMap.user = makePerson({
				cid     : makeCid(),
				css_map : {top : 25, left : 25, 'background-color':'#8f8'},
				name    : name
			});

			sio.on( 'userupdate', completeLogin );//类似ajax的success方法，监听后台触发userupdate事件

			//类似发送ajax访问，需要sio对象支持这些支持这些事件并提供给我们
			sio.emit( 'adduser', {
				cid     : stateMap.user.cid,
				css_map : stateMap.user.css_map,
				name    : stateMap.user.name
			});
		};

		logout = function (){
			//设置stateMap.user为匿名用户对象,同时发布spa-logout事件
			var is_removed,user = stateMap.user ;
			// when we add chat, we should leave the chatroom here

			is_removed = removePerson(user) ;
			stateMap.user = stateMap.anon_user ;

			$.gevent.publish("spa-logout",[user]) ;

			return is_removed ;

		};

		return {
			get_by_cid : get_by_cid ,
			get_db     : get_db,
			get_user   : get_user,
			login      : login,
			logout     : logout
		};
	})();

	initModule = function(){
		var i , people_list , person_map ;

		// initialize anonymous person
		stateMap.anon_user = makePerson({
			cid   : configMap.anon_id,
			id    : configMap.anon_id,
			name  : 'anonymous'
		});

		stateMap.user = stateMap.anon_user;

		if ( isFakeData ) {
			people_list = spa.fake.getPeopleList();
			for ( i = 0; i < people_list.length; i++ ) {
				person_map = people_list[ i ];
				makePerson({
					cid     : person_map._id,
					css_map : person_map.css_map,
					id      : person_map._id,
					name    : person_map.name
				});
			}
		}
	};

	return {
		initModule : initModule ,
		people : people
	}

}());
