const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const request = require('superagent');
const superagent = require('superagent-charset')(request);
const _url = require('url');
const _path = require('path');
const colors = require("colors");

const Util = require('../public/util.js');
const Pc = require('./p_config.js');



class Index {
    constructor() {
        this.browser = null;
        this.webConfig = {};
        this.engineId = '';
        this.firstPageId = '';
        this.nomalAddress = '#baidu.com#sogou.com#bing.com#so.com';
        this.engine = {};
        this.sendData = {};
        this.Keyword = [];
        this.KeywordIndex = 1;
        this.pageIndex = 1; //搜索引擎当前的页码
        this.checkedNames = 0; //搜索引擎递归到几层   的位置信息
        this.offset = []; //引擎上链接坐标
        this.offsetIndex = 0;
        this.Available = []; //所有可用链接
        this.proxy = new Proxy({
            page: null,
            index: null,
        }, {
            get: (target, key, receiver) => {
                return target[key]
            },
            set: async (target, key, receiver) => {
                target[key] = receiver
                try {
                    this.proxy.page.setDefaultNavigationTimeout(15000);

                } catch (error) {
                    console.log('设置默认超时时间失败')

                }
                return true
            }
        })
    }
    /**
     * websoket 推送消息
     */
    PushMessages(msgJson) {
        try {
            this.conn.sendText(JSON.stringify(msgJson))
        } catch (error) {
            console.log('websocket在推送消息的时候失败了')
        }
    }
    async mouseClick() {
        return new Promise(async (resolve) => {
            console.log('点击了一次.............................');
            await this.closeOtherPages();
            this.proxy.page = await Pc.$p_getCurrentPage(this.browser, true, this.engineId);
            let el = this.offset[0];
            await this.proxy.page.evaluate((el) => {
                el.click();
            }, el).catch((err) => {
                console.log(err)
            })
            await this.proxy.page.waitFor(1000);
            resolve();
        })
    }
    /**
     * 监听值的变化
     */
    async watchXY() {
        return new Promise(async (reslove, reject) => {
            let qyel = this.engine.content;
            try {
                await this.proxy.page.waitFor((qyel) => !!document.querySelector(qyel), {}, qyel)
            } catch (error) {
                console.log(`watchXY方法在等待指定内容出现时超时---------------------》》》》直接进入下一页`);
                return this.nextPage(); //直接进入下一页
            }
            let newOffset = Object.assign([], this.offset) //获取最新的坐标
            let height = 0,
                offsetLength = newOffset.length;
            if (offsetLength >= 2) {
                height = newOffset[1].y - newOffset[0].y //获取当前块有多高
            }
            await this.proxy.page.evaluate((obj) => {
                document.body.style.cursor = "url(resource/pic/icons/magnifier3.cur) 12 12,crosshair";
                document.getElementsByTagName('style')[0].append(`${obj.qyel}:hover{font-size: 20px;}`)
                let el = document.querySelectorAll(obj.qyel); //把每个a标签都设置成新窗口打开
                for (let i = 0; i < el.length; i++) {
                    el[i].setAttribute('target', '_blank')
                }
                if (obj.offsetLength >= 2) {
                    window.scrollBy(0, obj.height - 10);
                }
                if (obj.offsetLength == 0) { //防止广告挡住可视区域
                    let h = el[0].getBoundingClientRect().y; //滚动到可视区域
                    window.scrollBy(0, h - 100);
                }
            }, {
                height,
                qyel,
                offsetLength
            })
            this.offset = [];
            let allA = await this.proxy.page.$$(qyel);
            allA.splice(0, this.offsetIndex) //出去已经点击过的链接
            this.offset = allA;
            // for (let i = 0; i < allA.length; i++) {
            //     let box = await allA[i].boundingBox()
            //     let x = box.x + (box.width / 2);
            //     let y = box.y + (box.height / 2);
            //     this.offset.push({
            //         x,
            //         y
            //     })
            // }
            reslove();
        })
    }
    async initBrower() {
        let executablePath = await Util.GetChromePath();
        const browser = await puppeteer.launch({
            headless: false,
            ignoreHTTPSErrors: true,
            executablePath: "D:/Program Files/chrome-win/chrome.exe",
            //  executablePath: _path.resolve(__dirname, '..', 'chrome-win/chrome.exe'),
            slowMo: 0,
            devtools: false,
            args: ["--proxy-server='direct://'", '--proxy-bypass-list=*']
        })
        browser.on('targetcreated', (msg) => {
            //console.oldLog(msg);
        })
        return browser
    }

    async launch() {
        // Pc.$P_setData({
        //     content: '',
        //     flags: 'w',
        //     enter: '',
        //     name: 'FirstLevelAddress.txt'
        // }) //清空文件
        Pc.$P_setData({
            content: '',
            flags: 'w',
            enter: '',
            name: 'address.txt'
        }) //清空文件
        this.webConfig = Util.$getConfig(); //先获取前端页面设置的配置信息
        this.webConfig.address += this.nomalAddress //添加默认白名单地址到配置项中
        this.Keyword = Object.assign([], this.webConfig.Keyword.split('#')); //使用原型创建对象 修改不会改变原对象
        this.engine = Pc.$p_getConfigData(this.webConfig.engine);
        const browser = await this.initBrower();
        this.browser = browser;
        let pages = await browser.pages();
        this.firstPageId = pages[0]._target._targetId;
        this.LoopKeyword();
    }
    /**
     * 循环递归关键字
     */
    async LoopKeyword() {
        this.pageIndex = 1;
        let pages = await this.browser.pages(); //获取所有的页面
        if (pages.length > 0) { //有多余的页面 保留第一个tab页面
            for (let i = pages.length - 1; i > 0; i--) {
                await pages[i].close();
            }
        }
        this.proxy.page = await this.browser.newPage();
        try {
            await this.proxy.page.goto(this.engine.href);
            this.engineId = this.proxy.page.target()._targetId;
        } catch (error) {
            console.log(`指定的搜索引擎无法打开，请检查配置信息`.red);
            this.sendData = {
                type: 10,
                msg: '指定的搜索引擎无法打开，请检查配置信息'
            }
            this.PushMessages(this.sendData);
            return await this.browser.close();
        }
        this.sendData = {
            type: 11,
            msg: `关键词总数：${this.webConfig.Keyword.split('#').length}  当前正在采集第：${ this.KeywordIndex} 个   当前采集关键字：${this.Keyword[0]}`
        }
        this.PushMessages(this.sendData);
        await this.proxy.page.waitFor(500);
        await this.proxy.page.keyboard.type(this.Keyword[0]);
        this.Keyword.splice(0, 1) //剪切到第一位上已经输入过的关键字
        this.KeywordIndex++;
        await this.proxy.page.waitFor(500);
        if(this.engine.searchBtn !=undefined){
            await this.proxy.page.click(this.engine.searchBtn);
        }else{
            await this.proxy.page.keyboard.press('Enter');
        }
        this.inputTextGetUrls();
    }
    /**
     * 首次打开制定搜索引擎  并输入 需要搜索的数据  并获取当前数据的坐标
     */
    async inputTextGetUrls() {
        this.offset = [];
        this.offsetIndex = 0;
        await this.watchXY();
        try {
            // await this.proxy.page.mouse.click(this.offset[0].x, this.offset[0].y, {
            //     delay: 1000
            // });
            await this.mouseClick();
        } catch (error) {
            console.log(`首页引擎链接点击打开失败`.red)
        }
        this.offset.splice(0, 1) //移除已经点击过后的
        this.offsetIndex++;
        await this.proxy.page.waitFor(2000);
        this.saveUrl();
        //this.LoopOpenPage2();
    }
    async LoopOpenPage2() {
        await this.proxy.page.waitFor(1000);
        this.proxy.page = await Pc.$p_getCurrentPage(this.browser);
        let url = this.proxy.page.url();
        superagent.get(url).end((err, res) => {
            if (err) {
                console.log('访问错误')
                return false;
            }
            let $ = cheerio.load(res.text);

        })
    }
    /**
     * 进入一级链接后开始获取url 保存可用url
     */
    async saveUrl(nomal = true, page) {
        console.log('saveUrl')
        try {
            this.proxy.index = '2';
            if (page == undefined) {
                await this.proxy.page.waitFor(1000);
                this.proxy.page = await Pc.$p_getCurrentPage(this.browser);
            }
            await this.proxy.page.waitFor(1000)
            console.log(`----------等待页面时间已过，开始判断当前是否为引擎拦截页面`.magenta)
            let loopPageSelect = async () => {
                try {
                    console.log(`loopPageSelect`)
                    return await this.proxy.page.$(this.engine.warningEl); //先验证是不是被搜索引擎页面
                } catch (error) {
                    console.log(`验证是不是被搜索引擎页面安全卫士拦截出错了`.red);
                    this.proxy.page = await Pc.$p_getCurrentPage(this.browser) //重新获取page对象
                    return await loopPageSelect();
                }
            }
            let isWarningPage = await loopPageSelect();
            if (isWarningPage != null) {
                let warnText = await this.proxy.page.evaluate((el) => {
                    return document.querySelector(el).innerText.trim();
                }, this.engine.warningEl)
                if (warnText === this.engine.warningText) {
                    console.log(`-----------准备点击搜索引擎的跳过按钮`.magenta)
                    await this.proxy.page.waitFor((qyel) => !!document.querySelector(qyel), {}, this.engine.skipWarning)
                    await this.proxy.page.click(this.engine.skipWarning);
                    console.log(`点击搜索引擎的跳过按钮完成-----------`.magenta)
                    await this.proxy.page.waitFor(2000);
                    console.log('过了等待');
                    return await this.saveUrl(nomal, page);
                }
            }
            console.log(`已经跳过引擎拦截页面并处理-----------`.magenta)
            let currentUrl = _url.parse(this.proxy.page.url());
            let urls = await this.getCurrentPageUrls();
            //先获取当前文件里面的内容
            let successData = await Util.$getTxtData({
                path: `${__dirname}/addressInfo/FirstLevelAddress.txt`
            })
            //把字符串改成数组
            let successDataArr = successData.msg.split(`
`)
            let regGov = /(.gov)$/;
            let twoUrls = [];
            for (let i = 0; i < urls.length; i++) {
                let pn = _url.parse(urls[i]);
                let reg = /(\ .bmp|\.jpg|\.png|\.tif|\.gif|\.pcx|\.tga|\.exif|\.fpx|\.svg|\.psd|\.cdr|\.pcd|\.dxf|\.ufo|\.eps|\.ai|\.raw|\.WMF|\.webp|\.jpeg|\.JPG|\.htm|\.js|\.css)$/
                if (!reg.test(pn.pathname)) { //只需要网址
                    if (this.webConfig.checkedNames.length > 1) { //只要外链接在获取层级高于1级情况
                        if (Pc.$P_topAddress(pn.host) === Pc.$P_topAddress(currentUrl.host)) {
                            continue;
                        }
                    }
                    if (this.webConfig.address.includes(Pc.$P_topAddress(pn.host))) { //排除黑名单
                        continue;
                    }
                    if (nomal && this.webConfig.checkedNames.length > 2) { //只有是获取网址2级以上的才保存起来
                        this.Available.push(pn.href);
                    }
                    let pathObj = _url.parse(pn.href);
                    if (nomal && this.webConfig.checkedNames.length == 2 && pathObj.hostname.indexOf('.gov') == -1) {
                        twoUrls.push(`${pathObj.protocol}//${pathObj. host}`)
                    } else {
                        if (pathObj.hostname.indexOf('.gov') == -1) {
                            successDataArr.push(`${pathObj.protocol}//${pathObj. host}`); //把当前已经获取到的url也放到已经保存的数组中 以便后续去重
                        }
                    }
                }
            }
            if (nomal && this.webConfig.checkedNames.length == 2) {
                successDataArr = successDataArr.concat(twoUrls)
            }
            let newDataArr = Util.unique(successDataArr) //去除重复后的数组并排除空行
            let successInfo = await Pc.$P_setData({ //ok 你是成功的 来吧 小金罐走一波
                content: newDataArr.join('\n'),
                flags: 'w',
                enter: '\n',
                name: 'FirstLevelAddress.txt'
            })
            console.oldLog(JSON.stringify(successInfo));
            if (successInfo.status) {
                if (successData.status) {
                    let json = {
                        type: 1,
                        msg: newDataArr
                    }
                    this.PushMessages(json);
                }
            } else {
                let json = {
                    type: 10,
                    msg: '保存当前url失败',
                }
                this.PushMessages(json);
            }
            console.log(`Available:${this.Available.length}`)
            return await this.LoopOpenPage(nomal);
            //this.LoopOpenPage2()
        } catch (error) {
            console.log(`在获取当前页面中所有链接的时候出错了在获取当前页面中所有链接的时候出错了:${error}`.red)
            return await this.LoopOpenPage(nomal);
        }
    }
    /**
     * 获取当前页面的urls
     */
    async getCurrentPageUrls() {
        console.log(`-----------开始获取当前页面的url链接`.cyan)
        let urls = [];
        urls.push(this.proxy.page.url()) //把自身地址也要添加进去
        if (this.webConfig.checkedNames.length == 1) {
            console.log(`当前只需要一级链接。`.cyan)
            return urls;
        }
        await this.proxy.page.waitFor(1000);
        let iframes = await this.proxy.page.frames(); //获取所有的iframe
        console.log('这是虽有的iframe的长度：' + iframes.length)
        for (let i = 0; i < iframes.length; i++) {
            let if_url = _url.parse(iframes[i].url());
            let iframesUrl = [];
            try {
                console.log('iframes:' + i)
                let promise1 = new Promise(async (resolve) => {
                    let stop = null;
                    stop = setTimeout(() => {
                        resolve(iframesUrl);
                    }, 15000)
                    let evaluateData = {
                        purl: if_url
                    }
                    iframesUrl = await iframes[i].evaluate((obj) => {
                        let urls = [];
                        try {
                            let regUrls = document.body.innerHTML.match(/http:\/\/[^\s<>]*\b/g);
                            if (regUrls != null) {
                                urls = urls.concat(regUrls)
                            }
                            let reg = /^((https|http)?:\/\/)[^\s]+/
                            let Tag = document.getElementsByTagName('a');
                            for (let j = 0; j < Tag.length; j++) {
                                let url = null;
                                let e = Tag[j].getAttribute('href') + ''.trim();
                                if (e != 'null' && e != '' && e != '#' && e.indexOf('javascript:') == -1) {
                                    if (!reg.test(e)) {
                                        url = `${obj.purl.protocol}//${obj.purl.host}${obj.purl.pathname}` + e
                                    } else {
                                        url = e;
                                    }
                                    urls.push(url);
                                }
                            }
                        } catch (error) {
                            console.log('代码有毒')
                        }
                        return urls;
                    }, evaluateData);
                    resolve(iframesUrl);
                    clearTimeout(stop);
                })
                iframesUrl = await promise1;

            } catch (error) {
                console.log(`获取iframe里面的内容失败:${error}`.red);
            }
            urls = urls.concat(iframesUrl)
        }
        let purls = await this.proxy.page.evaluate(() => {
            return document.body.innerHTML.match(/http:\/\/[^\s<>]*\b/g);
        }).catch((err) => {
            purls = null;
        })
        if (purls === null) {
            purls = [];
        }
        urls = urls.concat(purls);
        console.log(`获取当前页面的url链接结束并保存成功-------------`.cyan)
        return urls;
    }
    /**
     * 循环检查页面打开是否正常
     */
    async LoopOpenPage(nomal) {
        console.log('进入循环检查页面：LoopOpenPage');
        await this.closeOtherPages();
        if (this.webConfig.checkedNames.length > this.checkedNames) { //检查当前是否已经到了指定的层级
            this.proxy.page = await this.browser.newPage(); //打开一个新窗口
            let intervalFun = async () => {
                if (this.Available.length > 0) {
                    console.log(`循环intervalFun`)
                    try {
                        await this.proxy.page.goto(this.Available[0]); //进去，起飞二级目录
                        this.Available.splice(0, 1); //移除已经点击过后的链接
                        return true;
                    } catch (error) {
                        console.log('新开页面错了 错误'.red)
                        console.log(error)
                        this.Available.splice(0, 1); //移除已经点击过后的链接
                        return intervalFun();
                    }
                }
                return false;
            }
            let pageFlag = await intervalFun(); //当前页面是不是已经打开了
            if (pageFlag) {
                this.saveUrl(false, this.proxy.page);
            } else {
                if (this.offset.length == 0) {
                    await this.closeOtherPages();
                    return await this.nextPage();
                } else {
                    await this.closeOtherPages()
                    await this.proxy.page.waitFor(1000)
                    this.proxy.page = await Pc.$p_getCurrentPage(this.browser) //获取最新的page对象
                    // await this.watchXY();
                    // await this.proxy.page.mouse.click(this.offset[0].x, this.offset[0].y, {
                    //     delay: 1000
                    // });
                    await this.mouseClick();
                    if (this.offsetIndex === 9) {
                        console.log(66)
                    }
                    this.offset.splice(0, 1) //移除已经点击过后的
                    this.offsetIndex++;
                    console.log(this.offset.length);
                    this.checkedNames = 0;
                    await this.proxy.page.waitFor(2000)
                    return await this.saveUrl();
                }
            }
        } else {
            this.checkedNames = 0;
        }
    }
    /**
     * 点击下一页，继续我们的快乐之旅
     */
    async nextPage() {
        if (this.pageIndex >= this.webConfig.pages) {
            return await this.IsSuccessful();
        }
        await this.proxy.page.waitFor(1000);
        this.proxy.page = await Pc.$p_getCurrentPage(this.browser);
        let btnNext = this.engine.bottom;
        try {
            await this.proxy.page.waitFor((btnNext) => !!document.querySelector(btnNext), {}, btnNext)
        } catch (error) {
            console.log('获取点击下一页按钮，失败，没有下一页按钮-------------------》》》》》当前关键词结束');
            return await this.IsSuccessful();
        }
        let btnEls = await this.proxy.page.$$(btnNext);
        await this.proxy.page.evaluate(() => { //滚动到底部 点击下一页按钮
            window.scrollTo(0, document.body.scrollHeight)
        }).catch((err) => {
            console.log('滚动到底部失败' + err)
        })
        let location = await btnEls[btnEls.length - 1].boundingBox(); //获取最后一个坐标
        await this.proxy.page.mouse.click(location.x, location.y, {
            delay: 1000
        });
        await this.proxy.page.waitFor(1000);
        this.proxy.page = await Pc.$p_getCurrentPage(this.browser);
        await this.proxy.page.waitFor(1000)
        this.pageIndex++; //页面加着走
        this.inputTextGetUrls();
    }
    /**
     * 检测当前页面上的外链接的是否已经赛选完毕了
     */
    async urlIsEmtry(result) {
        this.getValidUrl();
        if (result.length == 0) { //当前页面已经没有数据了  我们需要点击下一页
            if (this.proxy.pageIndex > this.webConfig.pages) { //当前页码必须小于等于用户设置的页码 那么我们点击下一页

            } else { //扫描完毕,程序结束
                this.stop();
            }
        }
    }
    /**
     * 获取url并且验证url是否在黑名单内
     */
    async getValidUrl(url) {
        let address = this.webConfig.address
        let w_url = _url.parse(url); //node 支持的完整的url
        if (address.indexOf(w_url.host) !== -1) {
            return false
        }
        return true
    }
    /**
     * 打开指定页面并截图保存
     */
    async openPageSaveImg(conn) {
        await Util.$removeAllFiles({
            path: _path.resolve(__dirname, '..', 'static/serverImages'),
        });
        await Util.$writeFileContent({
            path: _path.resolve(__dirname, 'addressInfo/addressKeyVal.json'),
            data: {},
            enter: '',
            flags: 'w'
        })
        this.conn = conn;
        let errorCount = 0;
        let successCount = 0;
        let sendData = {};
        let urlsInfo = await Util.$getTxtData({
            path: `${__dirname}/addressInfo/FirstLevelAddress.txt`
        })
        if (!urlsInfo.status) {
            return {
                status: false,
                msg: '获取链接失败'
            }
        }
        let list = urlsInfo.msg.split(`
`) //获取到当前数据的集合
        if (list.length === 0) { //如果当前数据没有 那么直接告诉客户端没有数据
            return {
                status: true,
                msg: []
            }
        }
        sendData = {
            type: 10,
            msg: `网站转换图片进行中.....   0/${list.length}`
        };
        this.PushMessages(sendData);

        const path = _path.resolve(__dirname, '..', 'static/serverImages');
        const browser = await this.initBrower(); //打开浏览器
        this.browser = browser;
        let page = await browser.newPage();
        await page.setViewport({
            width: 1200,
            height: 800
        });
        for (let i = 0; i < list.length; i++) {
            if (list[i].trim() != '') {
                try {
                    await page.goto(list[i]);
                } catch (error) {
                    errorCount++;
                    continue
                }
                try {
                    await page.screenshot({
                        path: `${path}/${i}.png`,
                    })
                    let valJson = JSON.parse(Util.$getFilesContents(`${__dirname}/addressInfo/addressKeyVal.json`)) //获取文件内容
                    let addJson = {};
                    addJson[i] = list[i]
                    Object.assign(valJson, addJson);
                    await Util.$writeFileContent({
                        path: _path.resolve(__dirname, 'addressInfo/addressKeyVal.json'),
                        data: valJson,
                        enter: '',
                        flags: 'w'
                    })
                    await page.waitFor(200);
                    successCount++;
                    let lists = await Util.$getStaticIms(true);
                    sendData = {
                        type: 10,
                        msg: `网站转换图片进行中.....   ${lists.msg.length}/${list.length}`
                    };
                    this.PushMessages(sendData);
                    sendData = {
                        type: 1,
                        msg: lists
                    }
                    this.PushMessages(sendData);
                } catch (error) {
                    console.log(`截图时发生错误:${error}`);
                }
            }
        }
        sendData = {
            type: 10,
            msg: `网站转图片已经完成。失败${errorCount}，成功${successCount}`
        };
        this.PushMessages(sendData);

        await browser.close();
        return {
            status: true,
            msg: []
        }
    }
    /**
     * 验证当前关键词是否爬取完成
     */
    async IsSuccessful() {
        console.log(`--------------------------分段关键字爬取完毕---------------------------`)
        if (this.Keyword.length !== 0) {

            return await this.LoopKeyword()
        }
        this.sendData = {
            type: 8,
            msg: '全部关键字爬取完毕，程序已完毕,资源已释放！！'
        }
        this.PushMessages(this.sendData);
        console.log('---------全部关键字爬取完毕，程序已完毕，资源已释放！！！----------'.cyan)
        return await this.browser.close();
    }
    /**
     * 滚动当前页面  以便于加载dom
     */
    async autoScroll(page) {
        let sh = await page.evaluate(async () => {
            return await new Promise((resolve, reject) => {
                let totalHeight = 0;
                let distance = 100;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve(scrollHeight);
                    }
                }, 100);
            });
        });
        return sh;
    }
    /**
     * 关闭两个以上的tab标签
     */
    async closeOtherPages() {
        return new Promise(async (reslove) => {
            let pages = await this.browser.pages();
            if (pages.length > 2) {
                for (let i = 0; i < pages.length; i++) {
                    if (pages[i]._target._targetId != this.engineId && pages[i]._target._targetId != this.firstPageId) {
                        await pages[i].close();
                    }
                }
            } else {
                console.log('没有两个以上的页面不用关闭')
            }
            reslove();
        })
    }
    /**
     * 错误信息捕捉
     */
    errorMsgCapture() {
        this.proxy.page.on('requestfinished', (msg) => {
            // console.log(msg)
        })
        this.proxy.page.on('error', (msg) => {
            console.log(`${msg}  这个地址页面发生了错误`)
        })
        this.proxy.page.on('pageerror', (msg) => {
            //  console.log(`${msg} 页面发生错误了pageerror`)
        })
        this.proxy.page.on('requestfailed', async (msg) => {


        })
    }
    async stop(urgentStop = true) {
        try {
            if (urgentStop) {
                this.sendData = {
                    type: 8,
                    msg: {
                        hand: true,
                    }
                }
                this.PushMessages(this.sendData);
            }
            await this.browser.close();
            //process.exit(0)
        } catch (error) {
            console.log(`紧急关闭浏览器发生了错误`.red);
        }
    }
    chageSocket(conn) {
        this.conn = conn;
    }
    init(conn) {
        this.conn = conn;
        this.launch();
    }


}
module.exports = new Index();