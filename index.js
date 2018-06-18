#!/usr/bin/env node

const inquirer = require('inquirer');
const admin = require('firebase-admin');
const caporal = require('caporal');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');
const readline = require('readline-sync');
const path = require('path');
const voca = require('voca');
const BigQuery = require("@google-cloud/bigquery")

var serviceKeyPath;
var type;
var accessApp;    // 여러 앱을 초기화 하기 위한 즉 , 두번째 admin 을 담을 변수
const osUserName = require("os").userInfo().username.toString();
const infoPath = '/Users/'+osUserName+'/.blu/'

//=====================================about caporal===============================================

caporal
    .version('0.1.3')
    .command('init' ,'setup of project')
    .action((args, options, logger) => {
        console.log(
            chalk.yellow(
                figlet.textSync('blu-cli',{horizontalLayout:'full'})
            )
        );
        console.log("\n\n");
        console.log("blu-cli module initialization");
        console.log("\n\n");
        input();
    })
    .command('db' , 'access to database')
    .action((args, options, logger) => {
        checkInit(false)
            .then(function (info) {
                // 성공시
                var currentPath = process.cwd().toString();
                var bufPath = currentPath.substring(info.topPath.length+1 , currentPath.length);
                var dbName = bufPath.split('/')[0];
                list = bufPath.split('/').splice(1, bufPath.split('/').length);
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
    })
    .command('upload','upload json to databse without interative')
    .option('-t,--dbtype <dbtype>', "type of database (bq or fb)")
    .option('-s,--source <source>', "json file which will upload to database")
    .option('-d,--destination <destination>', "destination of database.\nif databse type is fb, input depth of database. \nif database type is bq, input {projectId}/{datasetId}/{tableId}")
    .option('-k,--servicekey <servicekey>', "service key path of firebase project")
    .action((args, options, logger) => {
        if (!options.source || !options.destination || !options.servicekey || !options.dbtype || !(options.dbtype == 'fb' || options.dbtype == 'bq' )){
            showHelp();
        }

        // firebase 에 저장하기를 원하여 type을 fb로 주어진 경우
        if(options.dbtype == 'fb') {
            var dbName = options.destination.split("/")[0];
            var child = voca.replaceAll(options.destination, dbName, "");
            if (child === "") {
                child = "/";
            }
            adminInitialize(options.servicekey, dbName);
            upload(options.source, child);
        }else if(options.dbtype == 'bq'){
            insertToBigQuery(options.source,options.destination,options.servicekey)
        }



    });
caporal.parse(process.argv);



// ======================================= about init ======================


function input(){

    serviceKeyPath = readline.question("Input Service key's absolute path : ");
    // db_list = readline.question("Input database list path : (bluelens-browser/db_list) ");
    // if(db_list.length == 0 ){db_list = "bluelens-browser/db_list";}
    var info = {'serviceKeyPath': serviceKeyPath, 'topPath' : process.cwd()};
    if(fs.existsSync(infoPath)===false){fs.mkdirSync(infoPath)};
    fs.writeFile(infoPath+"blu-info.json", JSON.stringify(info), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("save blu-info.json finish in ~/.blu directory");
        process.exit(0);
    });
}


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



//========================================about  upload command ========================================

function upload(source, child){
    var trendinfo;
    try{
        trendinfo = JSON.parse(fs.readFileSync(source, 'utf8'));
    }catch (e) {
        console.log("\n"+source + " is not exist. check json file again\n");
        process.exit(0);
    }

    var db = accessApp.database();
    var ref = db.ref(child);

    setTimeout (function () {
        ref.set(trendinfo);
        l = source.split("/")
        filename = l[l.length-1]
        console.log ( "finish set "+filename);
        process.exit(0);
    }, 2000);

}

function showHelp(err) {
    if (err) {
        console.log(chalk.red(err));
    }
    let argv = []
    process.argv.forEach(arg => {
        argv.push(arg)
    })
    argv[3] = '-h'
    caporal.parse(argv)
}


//================== bq -=============

function insertToBigQuery(source,destination,key){
    dList = destination.split("/")
    projectId = dList[0]
    datasetId = dList[1]
    tableId = dList[2]

    const bigquery = new BigQuery({
        projectId: projectId,
        keyFilename: key
    });
   var rows = parseTrend(source)


    return bigquery
        .dataset(datasetId)
        .table(tableId)
        .insert(rows)
        .then(() => {
            console.log(`Inserted ${rows.length} rows `);
            return;
        })
        .catch(err => {
            if (err && err.name === 'PartialFailureError') {
                if (err.errors && err.errors.length > 0) {
                    console.log('Insert errors:');
                    err.errors.forEach(err => console.error(err));
                }
            } else {
                console.error('ERROR:', err);
            }
        });
}

function parseTrend(source){
    var rows = []
    var obj
    try{
        obj = JSON.parse(fs.readFileSync(source, 'utf8'));
    }catch (e) {
        console.log("\n"+source + " is not exist. check json file again\n");
        process.exit(0);
    }

    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        var site = keys[i]
        var objbuf = obj[keys[i]]
        timestamp = Object.keys(objbuf)[0]
        trends = objbuf[timestamp]
        ranks = Object.keys(trends)
        for(var j = 0; j < ranks.length; j++){
            if(typeof trends[ranks[j]] === 'string'){  // 네이버나 다음과 같이 link 가 없는 trend
                var a = {
                    site: site,
                    timestamp: timestamp,
                    rank: ranks[j],
                    content:trends[ranks[j]]
                }
                rows.push(a)
            }else if(typeof trends[ranks[j]] === 'object'){ // melon 과같이  link가 필요한 trend
                var melon_obj = trends[ranks[j]]
                var a = {
                    site: site,
                    timestamp: timestamp,
                    rank: parseInt(ranks[j]),
                    link: melon_obj['link'],
                    content:melon_obj['content']
                }
                rows.push(a)
            }
        }

    }
    return rows
}