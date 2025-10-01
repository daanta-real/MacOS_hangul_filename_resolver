/* [0] 사용법

   import nfd2nfc from './nfd2nfc.js';

   const nfdStr = "한글";
   const nfcStr = nfd2nfc.convert(nfdStr);

   console.log(nfcStr); // "한글"



   [1] 본 프로그램을 만든 목적   
   유니코드 인코딩은 여러 가지 방식으로 나눌 수 있다.
   대표적인 것이 NFC(완성형;일체형;각난닫...), NFD(조합형;분리형;ㄱㅏㄱㄴㅏㄴㄷㅏㄷ...)이다.

   맥은 NFC(일체형), NFD(조합형) 모두 지원하지만, 파일 이름은 NFD(조합형) 인코딩만 쓴다.
   윈도는 NFC(일체형)만 지원한다.
   맥 이름은 조합형으로 저장되고, 윈도에서는 그걸 완성형으로만 불러오므로,
   윈도에서 맥 파일명을 읽으면 깨져서 보이게 된다.

   따라서 맥 파일명을 윈도에서 정상적으로 불러오려면, NFD형식의 String을 NFC형식으로 형변환해줘야 한다.
   이를 정규화(Normalize)라 부르며,
   모던 브라우저에서는 String.prototype.normalize()를 통해 이 변환을 기본적으로 지원한다.

   익스플로러는 이 함수를 지원하지 않는다.
   익스에서 문자열 정규화를 하려면, 폴리필(Polyfill) 라이브러리를 쓰거나 수동으로 변환해 주거나,
   아니면 백단에서 정보를 불러올 떄 처음부터 변환해서 불러오든가 해야 한다.

   문제는 익스플로러 관련된 플젝을 진행할 때이다.
   만약 백단을 건드릴 수 없는 상황에서, 폴리필 라이브러리도 import 불가능하고 익스를 지원해야 한다면?
   외부적으로 해결할 수 있는 방법은 없다. 따라서 한글에 한해 정규화를 할 수 있도록
   간단한 스니펫을 만들어 보기로 했다.



   [2] 원리
   1) 유니코드에서 쓰이는 한글 자모 데이터에는 전용과 범용 두 가지가 있다.
      전자는 조합해서 글자를 만들기 위해 쓰이고 후자는 그런 것 없이 범용으로 쓰기 위해서 쓰인다.
      - 초중종성 전용 글자
         초성 전용 글자: 0x1100 (4352) ~ 0x1112 (4370)
         중성 전용 글자: 0x1161 (4449) ~ 0x1175 (4469)
        종성 전용 글자: 0x11a8 (4520) ~ 0x11c2 (10702)
      - 범용 글자 (※ 주의: 위와 달리 연속적인 범위가 아니다, 예외 글자가 많아 좀 빠져 있다)
        자음 범용 글자: 약 0x3131 (12593) ~ 0x314e (12622) 범위 내
        모음 범용 글자: 약 0x314F (12623) ~ 0x3163 (12643) 범위 내
   2) 글자 조립 방식에 따라 전자를 쓸지 후자를 쓸지가 다 다르다.
      초성+중성+종성 (칡, 닭, 랄, ... ) = 초성전용글자-중성전용글자-종성전용글자 를 조합함
      초성+중성      (테, 스, 트, ... ) = 초성전용글자-중성전용글자 를 조합함
      초성           (ㅌ, ㄱ,    ... ) = 자음범용글자 를 사용
   3) 그러니까, 자모가 분리된 NFD 방식의 한글 글자는 무조건 초성전용글자로 시작한다.
      문자열의 모든 원소에 대해서, 초성전용글자를 찾으면 거기서부터 중성 종성을 감지해서 이를 모아 조립시키면 되고,
      초성전용글자가 아니라면 그냥 그대로 통과시키면 된다.
      본 프로그램은 상기와 같은 개념을 활용하여 만들어졌다.



   [3] 참고사항
       1) 아래 string들을 테스트에 활용해 보라. 이것들은 NFD로 인코딩되어 있어, 글자 개수와 실제 length가 차이 난다.
          아애야얘어에여예오와왜외요우워웨위유으의이 각난닫랄맘밥삿앙잦찿캌탙팦핳 ㄲㄸ밦갃낝닭랋 ㄱㅅㄲㅈㅅㄲㄲ 테스트.jpg
       2) 맥에서 파일명이 초/중/종으로 분리 저장되면 겹자음/겹모음 등도 따로 분리될 것 같아 보이지만 아니다.
          각 초/중/종 글자는 무조건 단일 저장된다. 이를테면 ㅆ, ㅞ, ㅖ 이 있다.
          본 소스는 상기 패턴임을 상정하고 만들었으므로, 만약 원본 패턴이 다르면 코드를 적용할 수 없다.
       3) 본 스니펫은 한글에 한해서만 정규화를 지원한다.
          각종 유럽/라틴 등의 언어를 지원하지 않는 점 명심할 것.



*/


// 디버그용. 실제로 쓰실 땐 false로 놓고 쓰세요
const debug = false;

// 클래스 구조 선언
const nfd2nfc = {
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
    const base = 44032; // 유니코드 한글 시작 번호
    const idxTop = 588 * nfd2nfc.dic.top.indexOf(arr[0].charCodeAt(0)); // 588글자마다 초성 1회전
    const idxMid = 28  * nfd2nfc.dic.mid.indexOf(arr[1].charCodeAt(0)); // 28 글자마다 중성 1회전
    const idxBot = arr.length < 3 ? 0 : nfd2nfc.dic.bot.indexOf(arr[2].charCodeAt(0));
    const result = String.fromCharCode(base + idxTop + idxMid + idxBot);
    return result;
};

// 문자열을 입력하면, 글자 단위로 분리해 배열을 만들어 회신하되, 한글 자모는 글자 단위로 모아준다.
// 이때, 초/중/종성은 각각 한 개의 글자로 되어 있다고 가정한다. (ex. '와' 글자는, ㅘ O / ㅗㅏ X)
nfd2nfc.convert = function(strOrg) {

    if(debug) console.log("변환할 문자열:", strOrg, "\n길이:", strOrg.length);
    const result = [];
    
    for(let i = 0, len = strOrg.length; i < len; i++) {

        let resultOne = "";
        if(debug) console.log("----------------------------------------------------");
        if(debug) console.log(i + "번째 검사. 검사할 글자:", strOrg.charAt(i));

        // slice할 끝점 설정
        const end = i + (
            nfd2nfc.dic.top.indexOf(strOrg.charCodeAt(i)) >= 0 // 첫째가 초성전용글자냐
                ? (nfd2nfc.dic.mid.indexOf(strOrg.charCodeAt(i + 1)) >= 0 // 둘째가 중성전용글자냐
                    ? (nfd2nfc.dic.bot.indexOf(strOrg.charCodeAt(i + 2)) >= 0 // 셋째가 종성전용글자냐
                        ? 2  // 초성-중성-종성 까지일 경우
                        : 1) // 초성-중성 까지일 경우
                    : 0)     // 초성 까지일 경우
                : 0          // 첫 글자가 초성조차 아닐 경우
        );
        if(debug) console.log("끝점: ", end);
        if(i < end) {
            if(debug) console.log("자를 구간: " + i + " ~ " + end);
            const sliced = strOrg.slice(i, end + 1);
            if(debug) console.log("잘라진 배열: ", sliced, " / 길이 " + sliced.length + " / " + typeof sliced);
            resultOne = nfd2nfc.assembly(sliced);
        } else {
            if(debug) console.log("잘라진 문자: ", i + " 하나");
            resultOne = strOrg.charAt(i);
        }

        if(debug) console.log("잘라진 최종 결과물:", resultOne);

        result.push(resultOne);
        if(debug) console.log("현재까지의 결과:", result);
        
        // 다음 검사할 글자 설정.
        i = end;
        if(debug) console.log("다음 커서 위치는:", i + 1);
        
    }

    if(debug) console.log("결과배열:", result);
    const joinedResult = result.join("");
    if(debug) console.log("결과문자열:", joinedResult);
    return joinedResult;

};

// 모듈 export
export default nfd2nfc;
