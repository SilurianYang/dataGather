const fs = require("fs");
const _path = require('path');
const proc = require('child_process');

class Util {
    constructor() {
        this.port = 3000;
        this.wPort = 3001;
    }
    $getConfig(key) {
        let reslut = fs.readFileSync(`${__dirname}/config.json`);
        if (typeof key == "undefined") {
            return JSON.parse(reslut.toString());
        } else {
            let resluts = JSON.parse(reslut.toString());
            return resluts[key];
        }
    }
    $setConfig(data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(`${__dirname}/config.json`, `${JSON.stringify(data)}`, (err1, files) => {
                if (err1) {
                    reject({
                        status: false,
                        msg: err1
                    });
                    return
                }
                resolve({
                    status: true,
                    msg: '写入配置成功'
                });
            })
        })
    }
    /**
     * 获取已经保存在txt文本中的内容
     */
    $getTxtData(params) {
        return new Promise((resolve, reject) => {
            fs.readFile(params.path, (err, data) => {
                if (err) {
                    reject({
                        status: false,
                        msg: err
                    });
                    return
                }
                resolve({
                    status: true,
                    msg: data.toString()
                });
            });
        })
    }
    /**
     * 获取static文件下所有网址已经转换成的图片
     */
    $getStaticIms(needUrls = false) {
        let promise1 = new Promise((resolve, reject) => {
            if (!needUrls) {
                return resolve();
            }
            let path = _path.resolve(__dirname, '..', 'puppeteer/addressInfo/addressKeyVal.json');
            let info = this.$getFilesContents(path)
            return resolve(JSON.parse(info));
        })
        return new Promise((resolve, reject) => {
            let path = _path.resolve(__dirname, '..', 'static/serverImages');
            fs.readdir(path, (err, files) => {
                if (err) {
                    resolve({
                        status: false,
                        msg: err
                    });
                    return
                }
                let list = [];
                if (needUrls) {
                    promise1.then((data) => {
                        files.forEach((file, index) => {
                            list.push({
                                images: `serverImages/${file}`,
                                url: data[file.match(/\d/g).join('')]
                            });
                        })
                        resolve({
                            status: true,
                            msg: list
                        });
                    })
                } else {
                    resolve({
                        status: true,
                        msg: list
                    });
                }
            })
        })
    }
    /**
     * 删除指定文件夹下面的指定文件
     */
    $removeFiles(obj) {
        return new Promise((resolve, reject) => {
            fs.readdir(obj.path, (err, files) => {
                if (err) {
                    reject({
                        status: false,
                        msg: err
                    });
                    return
                }
                let list = [];
                files.forEach((file) => {
                    if (obj.name == file) {
                        fs.unlink(`${obj.path}/${file}`, (err1) => {
                            if (err1) {
                                reject({
                                    status: false,
                                    msg: err1
                                });
                                return
                            }
                            resolve({
                                status: true,
                                msg: `删除${file}文件成功`
                            });
                        });
                        return
                    }
                })
            })
        })
    }

    /**
     * 获取指定文件的内容
     */
    $getFilesContents(path) {
        let reslut = fs.readFileSync(path);
        return reslut.toString()
    }
    /**
     * 写入指定文件的内容
     */
    $writeFileContent(obj) {
        return new Promise((resolve, reject) => {
            fs.open(obj.path, obj.flags, (err, data) => {
                if (err) {
                    reject({
                        status: false,
                        msg: err
                    })
                    return
                }
                let saveData = obj.data
                if (typeof obj.data !== 'string') {
                    saveData = JSON.stringify(obj.data)
                }
                fs.writeFile(data, `${saveData}${obj.enter}`, (err1,fd) => {
                    if (err1) {
                        reject({
                            status: false,
                            msg: err1
                        });
                        return
                    }
                    fs.close(data,(status)=>{
                    })
                    resolve({
                        status: true,
                        msg: '写入成功'
                    });
                })
            })
        })
    }
    /**
     * 删除指定目录下的所有文件
     */
    $removeAllFiles(obj) {
        return new Promise((reslove, reject) => {
            if (fs.existsSync(obj.path)) {
                fs.readdirSync(obj.path).forEach((file) => {
                    let curPath = obj.path + "/" + file;
                    if (fs.statSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                //  fs.rmdirSync(obj.path);
            }
            reslove({
                status: true,
                msg: `文清空完毕`
            })
            // fs.mkdir(obj.path, (err1) => {
            //     if (err1) {
            //         reject({
            //             status: false,
            //             msg: `目录删除成功但是创建失败`
            //         })
            //         return
            //     }
            //     reslove({
            //         status: true,
            //         msg: `目录删除成功`
            //     })
            // })

        })
    }
    /**
     * 数组去除重复 并排除空行
     * @param {} data 
     */
    unique(data) {
        let newArr = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i].trim() != '') {
                newArr.push(data[i]);
            }
        }
        return Array.from(new Set(newArr));

    }
    /**
     * 输出错误日志
     */
    OutputLog() {
        console.oldLog = console.log;
        console.log = function () {
            let logName = new Date().toLocaleDateString();
            let path = _path.resolve(__dirname, '..', `logs/${logName}.txt`);
            arguments.constructor.prototype.join = Array.prototype.join;
            let content = arguments.join('\r\n');
            fs.writeFile(path, content + '\r\n', {
                flag: 'a+'
            }, (err) => {
                if (err) {
                    //  console.oldLog(`输出日志错误:${err}`.red)
                }
            })
        }
    }
    /**
     * 获取谷歌路径
     */
    async GetChromePath() {
        const chromePath = await new Promise((succ, fail) => {
            var regUrl = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe";
            var cmdStr = 'reg query "' + regUrl + '"';
            var cp = proc.exec(cmdStr, (error, stdout, stderr) => {
                if (error != null) {
                    fail('exec error: ' + error);
                    return;
                }
                if (stderr != '') {
                    fail('output error: ' + stderr);
                    return;
                }

                var re = /reg_sz\s+(.+\.exe)/ig;
                var matchRet = re.exec(stdout);
                if (matchRet != null && matchRet.length > 1) {
                    return succ(matchRet[1]);
                } else {
                    return succ("");
                }
            });
        });
        return chromePath;
    }
}

module.exports = new Util();