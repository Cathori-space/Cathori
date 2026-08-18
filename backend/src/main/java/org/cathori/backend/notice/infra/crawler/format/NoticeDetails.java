package org.cathori.backend.notice.infra.crawler.format;

import java.util.List;

public record NoticeDetails(String bodyText, List<String> imageUrls) {
}
