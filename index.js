#!/usr/bin/env node

const caporal = require('caporal');
const chalk = require('chalk');
const figlet = require('figlet');
const fs = require('fs');
const readline = require('readline-sync');
const db = require('./db');
const upload = require('./upload');

var serviceKeyPath;
const osUserName = require("os").userInfo().username.toString();
const infoPath = '/Users/'+osUserName+'/.blu/'

//=====================================about caporal===============================================

caporal
    .version('0.1.4')
    .command('init' ,'setup of project')
    .action((args, options, logger) => {     /////// init /////////
        console.log("\n");
        console.log(
            chalk.yellow(
                figlet.textSync('blu-cli',{horizontalLayout:'full'})
            )
        );
        console.log("\n\n   ");
        console.log("blu-cli module initialization");
        console.log("\n\n");
        init();
    })
    .command('db' , 'access to database')       /////// db /////////
    .action((args, options, logger) => {
        db.db();
    })
    .command('upload','upload json to databse without interative')     /////// upload /////////
    .option('-t,--dbtype <dbtype>', "type of database (bq or fb)")
    .option('-s,--source <source>', "json file which will upload to database")
    .option('-d,--destination <destination>', "destination of database.\nif databse type is fb, input depth of database. \nif database type is bq, input {projectId}/{datasetId}/{tableId}")
    .option('-k,--servicekey <servicekey>', "service key path of firebase project")
    .action((args, options, logger) => {
        if (!options.source || !options.destination || !options.servicekey || !options.dbtype || !(options.dbtype == 'fb' || options.dbtype == 'bq' )){
            showHelp();
        }else{
            upload.upload(options);
        }
    });
caporal.parse(process.argv);



// ======================================= about init ======================

function init(){
    serviceKeyPath = readline.question("Input Service key's absolute path : ");

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

