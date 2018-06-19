const admin = require('firebase-admin');
const fs = require('fs');
const voca = require('voca');
const BigQuery = require("@google-cloud/bigquery")
var accessApp;

exports.upload = function (options) {
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
