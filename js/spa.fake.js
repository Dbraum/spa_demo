/*
 * spa.fake.js
 * Fake module
 */

/*jslint         browser : true, continue : true,
 devel  : true, indent  : 2,    maxerr   : 50,
 newcap : true, nomen   : true, plusplus : true,
 regexp : true, sloppy  : true, vars     : false,
 white  : true
 */
/*global $, spa */

/*使用事件就是将对象监听和触发分开写，避免了回调函数时的多层嵌套，其实也是一直回调，只不过形式改变了*/


spa.fake = (function () {
	var getPeopleList, fakeIdSerial, makeFakeId, mockSio;

	fakeIdSerial = 5;

	makeFakeId = function () {
		return "id_" + String(fakeIdSerial++);
	};

	getPeopleList = function () {
		return [
			{ name: 'Betty', _id: 'id_01',
				css_map: { top: 20, left: 20,
					'background-color': 'rgb( 128, 128, 128)'
				}
			},
			{ name: 'Mike', _id: 'id_02',
				css_map: { top: 60, left: 20,
					'background-color': 'rgb( 128, 255, 128)'
				}
			},
			{ name: 'Pebbles', _id: 'id_03',
				css_map: { top: 100, left: 20,
					'background-color': 'rgb( 128, 192, 192)'
				}
			},
			{ name: 'Wilma', _id: 'id_04',
				css_map: { top: 140, left: 20,
					'background-color': 'rgb( 192, 128, 128)'
				}
			}
		];
	};

	mockSio = (function () {
		var on_sio, emit_sio, callback_map = {};
		/*
		 *         这个方法给某个消息类型注册回调函数。比如，on_sio('userupdate',completeLogin)
		 *         会给userupdate的消息类型这次回调函数completeLogin
		 *         回调函数的参数是通过调用emit_sion的date参数
		 */
		on_sio = function (msg_type, callback) {
			callback_map[msg_type] = callback;
		};

		emit_sio = function(msg_type,data){
			if(msg_type === 'adduser' && callback_map.userupdate){
				setTimeout(function(){
					callback_map.userupdate(
						[{
							_id : makeFakeId()  ,
							name : data.name ,
							css_map : data.css_map
						}]
					);
				},3000) ;

			}
		}

		return { emit : emit_sio, on : on_sio };
	})();
	return {
		getPeopleList : getPeopleList,
		mockSio       : mockSio
	};
}());