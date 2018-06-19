#!/usr/bin/env node

const inquirer = require('inquirer');
const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline-sync');
const path = require('path');




var serviceKeyPath;
var type;
var accessApp;    // 여러 앱을 초기화 하기 위한 즉 , 두번째 admin 을 담을 변수
const osUserName = require("os").userInfo().username.toString();
const infoPath = '/Users/'+osUserName+'/.blu/'



exports.db = function () {
    checkInit(false)
        .then(function (info) {
            // 성공시
            var currentPath = process.cwd().toString();
            var bufPath = currentPath.substring(info.topPath.length+1 , currentPath.length);
            var dbName = bufPath.split('/')[0];
            var list = bufPath.split('/').splice(1, bufPath.split('/').length);
            adminInitialize(info.serviceKeyPath,dbName);
            if(dbName == "") {console.log("\n\nyou must enter to Database directory. \n\ncurrent path is "+process.cwd()+"\n\n")
                return;}
            doSelect(list);
            // var information = readInfoJson();
            // selectDB(information);
        }, function (error) {
            // 실패시
            console.error(error);
        });

}
// ======================================= about init ======================



function checkInit (param) {
    return new Promise(function (fulfill, reject) {
        var isInit = false;

        if(fs.existsSync(infoPath)) {
            fs.readdir(infoPath, (err, files) => {
                files.forEach(file => {
                    if (file == 'blu-info.json') {
                        isInit = true;
                    }
                });
                if (!isInit) reject('\n\nyou need to Initialize\n\n');
                else {
                    var info = readInfoJson(infoPath+'blu-info.json')
                    if(process.cwd().indexOf(info.topPath) == -1){
                        reject("\n\n  you need to new Initialize in this DB's root directory or check your current path.\n\n");
                        return;
                    }else{fulfill(info);}
                }
            });
        }else reject('\n\nyou need to Initialize\n\n');
    });
}


function adminInitialize(serviceKeyPath,database){
    try {
        var serviceAccount = require(serviceKeyPath);
    }catch (e) {
        console.log("\n\nservice key is not exist\n\n");
        process.exit(0);
    }
    accessApp =  admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://' + database + '.firebaseio.com'
    },'other');
}
// ======================================= about database =============================================

function doSelect(list){
    var childPath = '';
    inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'What do you want to do?',
            choices: [
                'Set Json File',
                'Get Json File',
                'Import from DB'
            ]
        }
    ]).then(answers =>{
        var jsonAnswer = JSON.parse(JSON.stringify(answers));
        type = jsonAnswer.type;

        list.forEach((item)=>{
            childPath = childPath +item +'/';
        });
        if(childPath == "") childPath = '/';
        // console.log(childPath);
        if(type.indexOf('Set') != -1){setJsonToFirebase(childPath)}
        if(type.indexOf('Get') != -1){getJsonFromFirebase(childPath)}
        if(type.indexOf('Import') != -1){importFromDB(childPath)}
    });
}


// ============get==========

function getJsonFromFirebase(childPath){

    var db = accessApp.database();
    var ref = db.ref();
    var list = [];
    var selectedChild;
    return ref.child(childPath).once('value').then((snapshot)=> {

        snapshot.forEach(function (childSnapshot) {
            list.push(childSnapshot.key);
        });
        if(list.length == 0 ){
            console.log('\n\nchild is not exist!\n\n');
            process.exit(0);
        }

        inquirer.prompt([
            {
                type: 'list',
                name: 'child',
                message: 'Select to get item\n',
                choices: list
            }
        ]).then(answers =>{
            var jsonAnswer = JSON.parse(JSON.stringify(answers));
            selectedChild = jsonAnswer.child;
            // var obj = JSON.parse(fs.readFileSync(jsonAnswer.file, 'utf8'));
            fs.writeFile("./"+selectedChild+".json", JSON.stringify(snapshot.child(selectedChild).val()), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
                process.exit(0);
            });
        });
    });
}

//===========set========

function setJsonToFirebase(childPath){

    var list=[];
    fs.readdirSync('./').map(function(child){
        if( fs.lstatSync("./"+child).isDirectory() || child.indexOf(".json") != -1) {
            list.push(child);
        }
    });

    inquirer.prompt([
        {
            type: 'list',
            name: 'child',
            message: 'Select to get item\n',
            choices: list
        }
    ]).then(answers =>{
        var jsonAnswer = JSON.parse(JSON.stringify(answers));
        var selectedChild = jsonAnswer.child;
        var parsedChild = "";
        if(selectedChild.indexOf(".json") != -1){
            parsedChild = selectedChild.split('.json')[0];
        }else{
            parsedChild = selectedChild;
        }
        childPath = childPath + parsedChild;
        var db = accessApp.database();
        var ref = db.ref(childPath);
        var jsonContents = JSON.parse(JSON.stringify(dirTree(process.cwd()+'/'+selectedChild)));
        setTimeout (function () {
            ref.set(jsonContents);
            console.log ( "finish set json data");
            process.exit(0);
        }, 2000);
    });
}



function dirTree(filename) {
    var stats = fs.lstatSync(filename),
        info = {};
    var name = path.basename(filename)
    if (stats.isDirectory()) {

        fs.readdirSync(filename).map(function(child) {
            if( fs.lstatSync(filename+"/"+child).isDirectory()){ // child is directory
                var renameChild = '"'+child+'"';
                info[child]= dirTree(filename + '/' + child);  // 디렉토리라면 재귀를 통한 DFS
            }else if(child.indexOf(".json") != -1 ){   // child is json file
                var buf = child.split('.json');
                info[buf[0]] = JSON.parse(fs.readFileSync(filename + '/' + child, 'utf8'));
            }
        });
    } else {
        if (name.indexOf('.json') != -1) {
            info = JSON.parse(fs.readFileSync(filename, 'utf8'));
        }
    }
    return info;
}



//=========import========

function importFromDB(childPath) {

    var db = accessApp.database();
    var ref = db.ref();
    if (childPath == "/"){
        return ref.child(childPath).once('value').then((snapshot)=> {
            // 필요한 json 값

            var b = JSON.parse(JSON.stringify(snapshot.val()));
            makeStructure(b,process.cwd());
            console.log("\n\nFinish import DB to this directory!!! \n\n");
        });
    }else{
        console.log("\n\nThis function is only can be use in Database top Depth\n\n");
        process.exit(0);
    }
}

function makeStructure(jsonOB , path){
    var list = Object.keys(jsonOB);
    list.forEach((item)=>{
        if(typeof jsonOB[item] == "object" ){
            var list2 = Object.keys(jsonOB[item]);
            list2.forEach((item2) => {
                if (typeof jsonOB[item][item2] == "object") {
                    if(!fs.existsSync(path + '/' + item)){
                        fs.mkdirSync(path + '/' + item, 0755);
                    }
                    makeStructure(jsonOB[item], path + '/' + item);
                }
                else {
                    fs.writeFile(path+'/'+item+'.json', JSON.stringify(jsonOB[item]), function(err) {
                        if(err) {
                            return console.log(err);
                        }
                        // console.log("save blu-info.json finish in ~/.blu directory");
                        process.exit(0);
                    });
                }

            });
        }
    });
}


var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
    }
};


function readInfoJson(path){
    var information = JSON.parse(fs.readFileSync(path,'utf8'));
    return information;
}



