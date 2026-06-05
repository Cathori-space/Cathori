package org.cathori.backend.alert.infra;

import org.cathori.backend.alert.application.NotificationQueryPort;
import org.cathori.backend.alert.application.NotificationRow;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Repository
public class NotificationQueryAdapter implements NotificationQueryPort {

    private final JdbcTemplate jdbcTemplate;

    public NotificationQueryAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<NotificationRow> findByUserIdWithCursor(Long userId, Long cursor, int limit) {
        StringBuilder sql = new StringBuilder(
                "SELECT ah.id, ah.notice_id, n.title, n.deadline_at, ah.matched_tag, ah.is_read, ah.created_at " +
                "FROM alert_history ah " +
                "JOIN notices n ON ah.notice_id = n.id " +
                "WHERE ah.user_id = ? AND ah.alarm_status = 'SUCCESS'"
        );
        List<Object> params = new ArrayList<>();
        params.add(userId);

        if (cursor != null) {
            sql.append(" AND ah.id < ?");
            params.add(cursor);
        }

        sql.append(" ORDER BY ah.id DESC LIMIT ?");
        params.add(limit);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            Date deadlineDate = rs.getDate("deadline_at");
            Timestamp createdAt = rs.getTimestamp("created_at");
            return new NotificationRow(
                    rs.getLong("id"),
                    rs.getLong("notice_id"),
                    rs.getString("title"),
                    deadlineDate != null ? deadlineDate.toLocalDate() : null,
                    rs.getString("matched_tag"),
                    rs.getBoolean("is_read"),
                    createdAt != null ? createdAt.toLocalDateTime() : null
            );
        }, params.toArray());
    }
}
