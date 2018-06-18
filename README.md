# Blu : CLI

[![npm version](https://badge.fury.io/js/blu-cli.svg)](https://badge.fury.io/js/blu-cli)


[![NPM](https://nodei.co/npm/blu-cli.png)](https://nodei.co/npm/blu-cli/)

Command Line Interface for set/get Json file from Firebase Realtime Dataabase


## About blu-cli
Firebase Project 내의 Default database 이외의 database에 json file을 set/get하기위한 Command Line Interface
#### Problem
* 현재 firebase-tools를 활용한 Firebase Realtime Database에 대한  database:set, databse:get은 default database에 제한되어 있다.
#### Solution
* Realtime Database와 동일한 구조를 갖는 Directory Structure 내에서 firebase-admin package와 service account key를 통해 database 접근과 Data의 get/set  


## Installation
```shell
$ npm install blu-cli -g
```

## Usage
### Init
Default git provider is Github
```shell
$ blu init
```
* blu init을 실행하게 되면 service key의 절대경로를 입력받게 된다. 이렇게 입력받은 service key의 절대경로(serviceKeyPath)와 init했을때의 경로(topPath)를 ~/.blu디렉토리에 저장하게 된다.

* blu init은 Database Directory Structure의 최상위 디렉토리에서 실행하여야 한다. 
init했을때의 저장한 topPath를 기준으로 하위 구조들을 비교하여 RealTime Database에 접근하기 때문이다.
 

### database
Default git provider is Github
```shell
$ blu db
```
* blu db는 'blu init'을 한 경로에서 database directory로 들어가야 사용가능하다.

* blu db 실행 후 Set JSON File / Get JSON File 을 선택할 수 있다.

    - Set Json File 선택시: 
        * 하위 디렉토리나 json file 을 선택할 수 있다.
        * 디렉토리를 선택하면 하위 Structure을 그대로 Realtime Database 에 set한다.
        * json file 선택시 해당 json file의 경로서부터 내용을 set다.
        
    - Get Json File 선택시:
        * 현재 Depth와 상응하는 Realtime Database의 하위 Element 목록들을 보여주며 하나를 선택하여야 한다.
        * 선택한 Element의 하위 Element들이 json형식으로 {element name}.json으로 현재 디렉토리에 생성된다.                    
 
    - Import From DB 선택시:
        * Import From DB는 directory structure의 Database 최상위 depth에서만 사용 가능하다.
        * Realtime Database를 Json형태로 가져와 Directory structure형태로 만들어 하위 구조를 그대로 만들어 준다.

