/**
 * 실제 파일을 변경하는 코드를 실행
 * <참조글>
 * 프로젝트 생성: https://koonsland.tistory.com/93
 * Cannot use import statement outside a module: https://gwang920.github.io/error/js-error(1)/
 * 파일명 변경: https://min9nim.github.io/2018/11/node-file/
 * node.js 단독 실행파일 만들기: https://godffs.tistory.com/3337
 * pkg : 이 시스템에서 스크립트를 실행할 수 없으므로...(ES6을 pkg로 변환해서 생기는 문제): https://hellcoding.tistory.com/entry/VSCode-%EC%98%A4%EB%A5%98-%EC%9D%B4-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%97%90%EC%84%9C-%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8%EB%A5%BC-%EC%8B%A4%ED%96%89%ED%95%A0-%EC%88%98-%EC%97%86%EC%9C%BC%EB%AF%80%EB%A1%9C
 */

console.log("시작..");

// LOAD
const fs = require('fs');
const path = './';
console.log("모듈 로드 및 환경설정 완료.");

// Main Function
function renameRun() {
    fs.readdir(path, (err, files) => {
        files.filter(file => /.pdf/.test(file)).forEach(fileName => {
            console.log(`파일 찾았다: ${fileName}`);
            const asis = path + "/" + fileName;
            const tobe = path + "/" + fileName.normalize();
            fs.rename(asis, tobe, function (err) {
                const result = !err ? '성공' : '실패';
                console.log(`파일명 변경 ${result} : ${asis} => ${tobe}`);
            });
        });
    });
}
console.log("실행함수 선언 완료.");

// 주 실행
console.log("실행..");
renameRun();
console.log("실행 완료.");
