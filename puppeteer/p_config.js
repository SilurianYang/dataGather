const fs = require('fs')

class P_index {
    constructor() {
        this.p_Data = {
            '0': {
                content: '#content_left h3.t a:nth-child(1)',
                href: 'https://www.baidu.com/',
                bottom: '#page>a.n',
                warningEl: '.container .header .title-link', //百度安全卫士验证区域  el对象
                skipWarning: '.operations.ng-cloak .click', //跳过百度安全卫士的链接对象
                warningText: '百度网址安全中心', //百度安全卫士对比处

            },
            '1': {
                content: '#main .results h3>a:nth-child(1)',
                href: 'https://www.sogou.com/',
                bottom: '#pagebar_container #sogou_next',
                warningEl: '.container .header .title-link', //百度安全卫士验证区域  el对象
                skipWarning: '.operations.ng-cloak .click', //跳过百度安全卫士的链接对象
                warningText: '百度网址安全中心', //百度安全卫士对比处
            },
            '2': {
                content: '#b_results>li h2>a:nth-child(1)',
                href: 'https://cn.bing.com',
                bottom: '#b_results .sb_pagN.sb_pagN_bp.b_widePag.sb_bp',
                warningEl: '.container .header .title-link', //百度安全卫士验证区域  el对象
                skipWarning: '.operations.ng-cloak .click', //跳过百度安全卫士的链接对象
                warningText: '百度网址安全中心', //百度安全卫士对比处
                searchBtn:'#sb_form_go'
            },
            '3': {
                content: '#main .result>li h3>a:nth-child(1)',
                href: 'https://www.so.com/',
                bottom: '#page #snext',
                warningEl: '.container .header .title-link', //百度安全卫士验证区域  el对象
                skipWarning: '.operations.ng-cloak .click', //跳过百度安全卫士的链接对象
                warningText: '360网址安全中心', //百度安全卫士对比处
            }
        }
    }
    $p_getConfigData(key) {
        let value = this.p_Data[key];
        return value;
    }
    /**
     * 获取当前显示的页面
     */
    async $p_getCurrentPage(browser, home = false,homeId) {
        let pages = await browser.pages();
        if (home) {
            for (let i = 0; i < pages.length; i++) {
                if (pages[i]._target._targetId == homeId) {
                    pages[i].setDefaultNavigationTimeout(15000);
                    return pages[i]
                }
            }
        }
        for (let i = 0; i < pages.length; i++) {
         let body=   await pages[i].$$('body');
         let status=true;
            if(body!=null){
                status = await pages[i].evaluate(() => {
                    console.log(document.hidden)
                    return document.hidden
                }).catch((err)=>{
                    console.log(err)
                })
            }
            if (status == false) {
                pages[i].setDefaultNavigationTimeout(15000);
                return pages[i]

            }
        }
    }
    /**
     * 获取顶级域名
     */
    $P_topAddress(url) {
        let arr = url.split('.');
        return arr[arr.length - 2] + '.' + arr[arr.length - 1]
    }
    /**
     * 保存已经获取到的数据
     */
    $P_setData(params) {
        return new Promise((resolve, reject) => {
            fs.open(`${__dirname}/addressInfo/${params.name}`, params.flags, (err, data) => {
                if (err) {
                    reject({
                        status: false,
                        msg: err
                    })
                    return
                }
                fs.writeFile(data, `${params.content}${params.enter}`, (err1) => {
                    if (err1) {
                        reject({
                            status: false,
                            msg: err1
                        });
                        return
                    }
                    resolve({
                        status: true,
                        msg: '保存地址成功'
                    });
                    fs.close(data,(status)=>{
                        console.log(status)
                    });
                })
            })
        })
    }
}
module.exports = new P_index();