package org.cathori.backend.notice.infra.crawler.source;

public enum DepartmentSource {

    // 기본 패턴: https://{code}.catholic.ac.kr/{code}/community/notice.do
    BUSINESS("business", "경영학과"),
    ACCOUNTING("accounting", "회계학과"),
    GBS("gbs", "국제경영학과"),
    BIOTECH("biotech", "생명공학"),
    BMCE("bmce", "바이오메디컬화학공학"),
    AIBME("aibme", "AI의공학"),
    MBS("mbs", "의생명과학"),
    BMSW("bmsw", "바이오메디컬소프트웨어"),
    CSIE("csie", "컴퓨터정보공학"),
    MTC("mtc", "미디어기술컨텐츠"),
    ICE("ice", "정보통신전자공학"),
    AI("ai", "인공지능"),
    DATASCIENCE("datascience", "데이터사이언스"),
    PHARMACY("pharmacy", "약학"),
    KOREAN("korean", "국어국문"),
    PHILOSOPHY("philosophy", "철학"),
    KOREANHISTORY("koreanhistory", "국사"),
    ENGLISH("english", "영어영문"),
    CN("cn", "중국언어문화"),
    FRENCH("french", "프랑스어문화"),
    SOCIALWELFARE("socialwelfare", "사회복지"),
    PSYCHOLOGY("psychology", "심리"),
    SOCIOLOGY("sociology", "사회"),
    CHILDREN("children", "아동"),
    SPED("sped", "특수교육"),
    IS("is", "국제학부"),
    LAW("law", "법학"),
    ECONOMICS("economics", "경제"),
    PA("pa", "행정"),
    GLOBALBIZ("globalbiz", "글로벌경영"),
    KLC("klc", "한국어문화"),
    CHEMISTRY("chemistry", "화학"),
    MATH("math", "수학"),
    PHYSICS("physics", "물리"),
    ENVI("envi", "에너지환경공학"),
    DESIGN("design", "공간디자인소비자"),
    CLOTHING("clothing", "의류"),
    FN("fn", "식품영양"),
    MUSIC("music", "음악"),
    VOICE("voice", "성악"),
    GAMC("gamc", "예술미디어융합"),
    TEACHING("teaching", "교직"),
    LIBERAL("liberal", "자유전공"),

    // 예외 패턴: URL 직접 지정
    JAPANESE("japanese", "일어일본문화",
            "https://japanese.catholic.ac.kr/japanese/major/notice.do"),
    CUK_COLLEGE("catholic-college", "CUK 특화 학부대학",
            "https://catholic-college.catholic.ac.kr/catholic_college/notification/notice.do"),
    MAJOR_CONVERGENCE("major-convergence", "융합전공",
            "https://major-convergence.catholic.ac.kr/major_convergence/notice/notice.do");

    private static final String BASE_URL_TEMPLATE =
            "https://%s.catholic.ac.kr/%s/community/notice.do";

    private final String code;
    private final String displayName;
    private final String customUrl;

    DepartmentSource(String code, String displayName) {
        this.code = code;
        this.displayName = displayName;
        this.customUrl = null;
    }

    DepartmentSource(String code, String displayName, String customUrl) {
        this.code = code;
        this.displayName = displayName;
        this.customUrl = customUrl;
    }

    public String getUrl() {
        if (customUrl != null) {
            return customUrl;
        }
        return String.format(BASE_URL_TEMPLATE, code, code);
    }

    public String getCode() { return code; }
    public String getDisplayName() { return displayName; }
}