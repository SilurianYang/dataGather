new Vue({
	el: '#root',
	data: {
		baseUrl: requestUrl,
		dataList: [],
		msginfo: '',
		ws: null,
		count: 0,
		socket:null,
	},
	created() {
		this.socket = new ReconnectingWebSocket(websocketUrl)
		this.socket.onmessage = (data) => {
			let info = JSON.parse(data.data);
			switch (info.type) {
				case 1: //推送的图片集合
					this.dataList = info.msg.msg
					break;
				case 4:
					if (info.msg.status) {
						layer.msg('加入白名单成功', {
							icon: 1,
							time: 500
						})
					} else {
						layer.msg('加入白名单失败', {
							icon: 2,
							time: 500
						})
					}
					break;
				case 10:
					this.msginfo = info.msg
					break;
				default:
					break;
			}
			console.log(data)
		}
		this.socket.onopen = (data) => {
			setTimeout(() => {
				this.socket.refresh();
			}, 300000)
			if (this.count == 0) {
				let sendData = {};
				sendData = {
					req: 1,
					msg: '启动截图程序'
				}
				this.socket.send(JSON.stringify(sendData))
			}
			this.count++;
			console.log('链接成功')
		}
		this.socket.onclose = () => {
			console.log('链接关闭')
		}
		this.ws = this.socket;
		//this.getUrls();
	},
	methods: {
		/**
		 * 操作按钮
		 */
		save(type, index, val) {
			let key = val.images.match(/\d{0,}.png/)[0];
			let sendData = {
				msg: val.url,
				key
			};
			switch (type) {
				case 1: //保存
					sendData.req = 2;
					this.dataList.splice(index, 1);
					break;
				case 2: //放弃
					this.dataList.splice(index, 1);
					sendData.req = 5;
					break;
				case 3: //加入白名单
					sendData.req = 4;
					break;
			}
			this.ws.send(JSON.stringify(sendData))
		},

		handle(type, msg) {
			if(type==2){
				this.ws.refresh();
				return
			}
			let sendData = {
				msg,
			};
			switch (type) {
				case 1: // 停止
					sendData.req = 8;
					break;
			}
			this.ws.send(JSON.stringify(sendData))
		},

		getUrls() {
			$.ajax({
				url: `${requestUrl}/getUrls`,
				success: (data) => {
					if (data.status) {

					}
				},
				error: () => {

				}
			})
		},

		/**
		 * 显示图片
		 */
		showImg(imgIndex) {
			layer.photos({
				photos: `#layer-img-${imgIndex}` //格式见API文档手册页
					,
				closeBtn: 1,
				anim: 5 //0-6的选择，指定弹出图片动画类型，默认随机
			});
		}
	}
})