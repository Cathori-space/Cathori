package org.cathori.backend.notice.application;

import java.util.List;

public record AiSummaryResult(List<String> summary, String deadline) {}
