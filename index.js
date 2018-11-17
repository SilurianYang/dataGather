const express = require('express');
const ws = require("nodejs-websocket")
const _url = require('url');
const _path = require('path');
const _chp = require('child_process');
const app = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({
    extended: false
});

const Prun = require('./puppeteer/p_index.js') //导入我的自动化工具
const Util = require('./public/util.js') //这是我的工具类，啥都有就是没有女朋友

 console.oldLog=console.log
 //Util.OutputLog(); //重写console.log()


app.use(express.static(`${__dirname}/static`))


app.post('/saveData', urlencodedParser, async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    let checkedNames = req.body['checkedNames[]'];
    if (!(checkedNames instanceof Array)) {
        checkedNames = [req.body['checkedNames[]']]
    }
    let queryDta = {
        checkedNames,
        engine: req.body['engine'],
        pages: req.body['pages'],
        address: req.body['address'],
        Keyword: req.body['Keyword'],
    }
    let status = await Util.$setConfig(queryDta);
    res.json(status);
})
app.get('/getUrls', async (req, res) => {

})

const server = app.listen(Util.port, function () {
    const host = server.address().address
    const port = server.address().port;
    _chp.exec(`start http://127.0.0.1:${port}`);
    console.log('-----------------------------------------------------------------新的开始-------------------------------------------------\r\n')
    console.oldLog(`访问此地址，开始你的表演http://127.0.0.1:${port}`);

})
const wsServer = ws.createServer((conn) => {
    Prun.chageSocket(conn);     //重新设置websocketde 链接对象
    conn.on("close", (code, reason) => {
        console.log("websocket:Connection closed")
    })
    conn.on('text', async (msg) => {
        try {
            let newMsg = JSON.parse(msg)
            let sendData = {};
            switch (newMsg.req) {
                case 1:
                    await Prun.stop(false);
                    await Prun.openPageSaveImg(conn)
                    break;
                case 2: //保存url
                case 5: //放弃url
                    if (newMsg.req == 2) {
                        let url = _url.parse(newMsg.msg);
                        let saveData = {
                            path: _path.resolve(__dirname, '已完成.txt'),
                            data: `${url.protocol}//${url.host}`,
                            enter: '\r\n',
                            flags: 'a+'
                        }
                        await Util.$writeFileContent(saveData)
                    }
                    let valJson = JSON.parse(Util.$getFilesContents(`${__dirname}/puppeteer/addressInfo/addressKeyVal.json`)) //获取文件内容
                    //清除对应图片  删除json文件中的key
                    delete valJson[newMsg.key.match(/\d/g).join('')];
                    await Util.$writeFileContent({
                        path: _path.resolve(__dirname, 'puppeteer/addressInfo/addressKeyVal.json'),
                        data: valJson,
                        enter: '',
                        flags: 'w'
                    })
                    let path = _path.resolve(__dirname, 'static/serverImages');
                    let info = await Util.$removeFiles({
                        path,
                        name: newMsg.key
                    })
                    console.log(JSON.stringify(info))
                    break;
                case 3:
                    let configInfo = Util.$getConfig();
                    sendData = {
                        type: 3,
                        msg: configInfo
                    }
                    conn.sendText(JSON.stringify(sendData))
                    break;
                case 4: //加入白名单
                    var configData = Util.$getConfig();
                    configData.address = configData.address + `#${_url.parse(newMsg.msg).host}`;
                    var successInfo = await Util.$setConfig(configData);
                    sendData = {
                        type: 4,
                        msg: successInfo
                    }
                    conn.sendText(JSON.stringify(sendData))
                    break;
                case 6:
                    var configData = Util.$getConfig();
                    if (configData.Keyword == '') {
                        configData.Keyword = newMsg.msg;
                    } else {
                        configData.Keyword = configData.Keyword + `#${newMsg.msg}`;
                    }

                    var successInfo = await Util.$setConfig(configData);
                    sendData = {
                        type: 6,
                        msg: successInfo
                    }
                    conn.sendText(JSON.stringify(sendData))
                    break;
                case 7: //燃烧把 puppeteer
                    await Prun.stop(false);
                    return Prun.init(conn);
                    break
                case 8: //关闭 puppeteer
                    await Prun.stop();
                    return
                    break
                case 9: //获取已完成列表
                    let successJson = Util.$getFilesContents(`${__dirname}/已完成.txt`) //获取文件内容
                    sendData = {
                        type: 9,
                        msg: successJson
                    }
                    conn.sendText(JSON.stringify(sendData))
                    break
                default:
                    break;
            }
        } catch (error) {

        }
    })
    conn.on('error', (err) => {
        console.log('websocket发生了错误')
        console.log(err)
    })

}).listen(Util.wPort)