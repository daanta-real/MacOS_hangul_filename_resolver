
// [0] 참고사항
// 1) 아래는 맥의 파일 이름을 이용해 작성한 테스트용 데이터이다. NFD로 인코딩되어 있어, 글자 개수와 실제 length가 차이 난다.
//    아애야얘어에여예오와왜외요우워웨위유으의이 각난닫랄맘밥삿앙잦찿캌탙팦핳 ㄲㄸ밦갃낝닭랋 ㄱㅅㄲㅈㅅㄲㄲ 테스트.jpg
// 2) 맥에서 파일명이 초/중/종으로 분리 저장되면 겹자음/겹모음 등도 따로 분리될 것 같아 보이지만 아니다.
//    각 초/중/종 글자는 무조건 단일 저장된다. 이를테면 ㅆ, ㅞ, ㅖ 이 있다.



// [1] 한영맥 글자가 다 섞인 문자열에서 자모분리된 글자만 찾으려면 어떻게 해야 할까?
// 1) 유니코드에서 쓰이는 한글 자모 데이터에는 전용과 범용 두 가지가 있다.
//    전자는 조합해서 글자를 만들기 위해 쓰이고 후자는 그런 것 없이 범용으로 쓰기 위해서 쓰인다.
//    - 초중종성 전용 글자
//      초성 전용 글자: 0x1100 (4352) ~ 0x1112 (4370)
//      중성 전용 글자: 0x1161 (4449) ~ 0x1175 (4469)
//      종성 전용 글자: 0x11a8 (4520) ~ 0x11c2 (10702)
//    - 범용 글자 (※ 주의: 위와 달리 연속적인 범위가 아니다, 예외 글자가 많아 좀 빠져 있다)
//      자음 범용 글자: 약 0x3131 (12593) ~ 0x314e (12622) 범위 내
//      모음 범용 글자: 약 0x314F (12623) ~ 0x3163 (12643) 범위 내
// 2) 글자 조립 방식에 따라 전자를 쓸지 후자를 쓸지가 다 다르다.
//    초성+중성+종성 (칡, 닭, 랄, ... ) = 초성전용글자-중성전용글자-종성전용글자 를 조합함
//    초성+중성      (테, 스, 트, ... ) = 초성전용글자-중성전용글자 를 조합함
//    초성           (ㅌ, ㄱ,    ... ) = 자음범용글자 를 사용
// 3) 결론. 자모분리된 글자는 무조건 초성전용글자로 시작한다.
//    초성전용글자를 찾으면 거기서부터 글자 조립시키면 되고,
//    나머지는 그냥 그대로 통과시키면 된다.



// [3] 한글 포함한 문자열 각개분리용 라이브러리

// 클래스 구조 선언
var nfd2nfc = {
    dic     : {},   // 초/중/종성 각 전용글자 Dictionary 선언
    assembly: null, // 자모 배열 → 글자 한 개로 변환해서 회신해 주는 함수
    convert : null  // 실제 변환 실시
};

// 초중성 글자 사전
nfd2nfc.dic = {
    top: [0x1100, 0x1101, 0x1102, 0x1103, 0x1104, 0x1105, 0x1106, 0x1107, 0x1108, 0x1109, 0x110A, 0x110B, 0x110C, 0x110D, 0x110E, 0x110F, 0x1110, 0x1111, 0x1112],
    mid: [0x1161, 0x1162, 0x1163, 0x1164, 0x1165, 0x1166, 0x1167, 0x1168, 0x1169, 0x116A, 0x116B, 0x116C, 0x116D, 0x116E, 0x116F, 0x1170, 0x1171, 0x1172, 0x1173, 0x1174, 0x1175],
    bot: [0x11A8, 0x11A9, 0x11AA, 0x11AB, 0x11AC, 0x11AD, 0x11AE, 0x11AF, 0x11B0, 0x11B1, 0x11B2, 0x11B3, 0x11B4, 0x11B5, 0x11B6, 0x11B7, 0x11B8, 0x11B9, 0x11BA, 0x11BB, 0x11BC, 0x11BD, 0x11BE, 0x11BF, 0x11C0, 0x11C1, 0x11C2]
};

// 자모 배열 [초성, 중성(, 종성))]을 입력하면, 글자 한 개로 합쳐서 회신해 주는 함수
// 초성과 중성은 무조건 넣어야 한다. 없으면 오류 나니 주의
nfd2nfc.assembly = function(arr) {
    var base = 44032; // 유니코드 한글 시작 번호
    var idxTop = 588 * nfd2nfc.dic.top.indexOf(arr[0].charCodeAt(0)); // 588글자마다 초성 1회전이다.
    var idxMid = 28  * nfd2nfc.dic.mid.indexOf(arr[1].charCodeAt(0)); // 28 글자마다 중성 1회전이다.
    var idxBot = arr.length < 3 ? 0 : nfd2nfc.dic.bot.indexOf(arr[2].charCodeAt(0));
    var result = String.fromCharCode(base + idxTop + idxMid + idxBot);
    return result;
    //return arr.split("").join("+"); // 작업중
}

// 문자열을 입력하면, 글자 단위로 분리해 배열을 만들어 회신하되, 한글 자모는 글자 단위로 모아준다.
// 이때, 초/중/종성은 각각 한 개의 글자로 되어 있다고 가정한다. (ex. '와' 글자는, ㅘ O / ㅗㅏ X)
nfd2nfc.convert = function(strOrg) {

    console.log("변환할 문자열:", strOrg);
    console.log("길이:", strOrg.length);
    var result = [];
    
    for(var i = 0, len = strOrg.length; i < len; i++) {

        var resultOne = "";
        console.log("----------------------------------------------------");
        console.log(i + "번째 검사. 검사할 글자:", strOrg.charAt(i));

        // slice할 끝점 설정
        var end = i + (
            nfd2nfc.dic.top.indexOf(strOrg.charAt(i).charCodeAt(0)) >= 0 // 첫째가 초성전용글자냐
                ? (nfd2nfc.dic.mid.indexOf(strOrg.charAt(i + 1).charCodeAt(0)) >= 0 // 둘째가 중성전용글자냐
                    ? (nfd2nfc.dic.bot.indexOf(strOrg.charAt(i + 2).charCodeAt(0)) >= 0 // 셋째가 종성전용글자냐
                        ? 2  // 초성-중성-종성 까지일 경우
                        : 1) // 초성-중성 까지일 경우
                    : 0)     // 초성 까지일 경우
                : 0          // 첫 글자가 초성조차 아닐 경우
        );
        console.log("끝점: ", end);
        if(i < end) {
            console.log("자를 구간: " + i + " ~ " + end);
            var sliced = strOrg.slice(i, end + 1);
            console.log("잘라진 배열: ", sliced, " / 길이 " + sliced.length + " / " + typeof sliced);
            resultOne = nfd2nfc.assembly(sliced);
        } else {
            console.log("잘라진 문자: ", i + " 하나");
            resultOne = strOrg.charAt(i);
        }

        console.log("잘라진 최종 결과물:", resultOne);

        result.push(resultOne);
        console.log("현재까지의 결과:", result);
        
        // 다음 검사할 글자 설정.
        // 위 코드에 따르면, 초성까지면 +0, 중성까지면 +1, 종성까지면 +2 되게 되어 있다.
        // 그리고 다음 루프 때에는 기본 +1 되니까, 커서 i는 총 +1 ~ +3칸까지 전진하게 된다.
        i = end;
        console.log("다음 커서 위치는:", i + 1);
        
    }

    console.log("결과배열:", result);
    result = result.join("");
    console.log("결과문자열:", result);
    return result;

}
