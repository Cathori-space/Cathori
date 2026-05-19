package org.cathori.backend.notice.application;

import java.util.List;

public interface NoticeFeedPort {
    List<NoticeRow> findFeed(NoticeFeedQuery query);
}
