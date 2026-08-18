package org.cathori.backend.notice.infra.ai;

import java.util.List;

public record AiSummaryResult(List<String> summary, String deadline) {}
