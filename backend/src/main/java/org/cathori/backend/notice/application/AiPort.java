package org.cathori.backend.notice.application;


import java.util.List;

public interface AiPort {
    AiSummaryResult summarize(String bodyText, List<String> ImgUrl);
}
