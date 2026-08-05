package com.studysync.learning.web;

import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.study.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/study")
public class StudyController {
    private final StudyTaskRepository taskRepo;
    private final StudySessionRepository sessionRepo;

    public StudyController(StudyTaskRepository taskRepo, StudySessionRepository sessionRepo) {
        this.taskRepo = taskRepo;
        this.sessionRepo = sessionRepo;
    }

    @GetMapping("/tasks")
    public List<StudyTask> getTasks(@RequestParam String userId) {
        return taskRepo.findByUserIdOrderByDeadlineAsc(userId);
    }

    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public StudyTask createTask(@RequestBody TaskRequest req) {
        StudyTask t = new StudyTask();
        t.setUserId(req.userId());
        t.setTitle(req.title());
        t.setSubject(req.subject());
        if (req.deadline() != null && !req.deadline().isEmpty()) {
            t.setDeadline(Instant.parse(req.deadline()));
        }
        return taskRepo.save(t);
    }

    @PutMapping("/tasks/{id}/toggle")
    public StudyTask toggleTask(@PathVariable UUID id) {
        StudyTask t = taskRepo.findById(id).orElseThrow(() -> new NotFoundException("Task not found: " + id));
        t.setCompleted(!t.isCompleted());
        return taskRepo.save(t);
    }

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable UUID id) {
        if (!taskRepo.existsById(id)) {
            throw new NotFoundException("Task not found: " + id);
        }
        taskRepo.deleteById(id);
    }

    @PostMapping("/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public StudySession logSession(@RequestBody SessionRequest req) {
        StudySession s = new StudySession();
        s.setUserId(req.userId());
        s.setSubject(req.subject());
        s.setDurationMinutes(req.minutes());
        return sessionRepo.save(s);
    }

    @GetMapping("/sessions")
    public List<StudySession> getSessions(@RequestParam String userId) {
        return sessionRepo.findByUserIdOrderBySessionDateDesc(userId);
    }

    // Productivity analytics: detailed metrics, breakdown, streak, and insights.
    @GetMapping("/analytics")
    public AnalyticsResponse analytics(@RequestParam String userId,
                                       @RequestParam(defaultValue = "7") int days) {
        if (days <= 0 || days > 90) days = 7;
        Instant from = Instant.now().minus(Duration.ofDays(days));
        List<StudySession> sessions = sessionRepo.findByUserIdAndSessionDateAfterOrderBySessionDateAsc(userId, from);
        List<StudySession> allSessions = sessionRepo.findByUserIdOrderBySessionDateDesc(userId);

        ZoneId zone = ZoneOffset.UTC;
        LocalDate today = LocalDate.now(zone);

        Map<LocalDate, int[]> buckets = new LinkedHashMap<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            buckets.put(d, new int[2]); // [minutes, sessions]
        }

        int totalMinutes = 0;
        int longestSessionMinutes = 0;
        Map<String, Integer> subjectBreakdown = new HashMap<>();
        Map<String, Integer> dayOfWeekMinutes = new HashMap<>();

        for (StudySession s : sessions) {
            LocalDate d = s.getSessionDate().atZone(zone).toLocalDate();
            int[] acc = buckets.computeIfAbsent(d, k -> new int[2]);
            acc[0] += s.getDurationMinutes();
            acc[1] += 1;

            totalMinutes += s.getDurationMinutes();
            if (s.getDurationMinutes() > longestSessionMinutes) {
                longestSessionMinutes = s.getDurationMinutes();
            }

            String subj = (s.getSubject() != null && !s.getSubject().isBlank()) ? s.getSubject().trim() : "General";
            subjectBreakdown.put(subj, subjectBreakdown.getOrDefault(subj, 0) + s.getDurationMinutes());

            String dayName = d.getDayOfWeek().name();
            dayOfWeekMinutes.put(dayName, dayOfWeekMinutes.getOrDefault(dayName, 0) + s.getDurationMinutes());
        }

        List<DayBucket> byDay = buckets.entrySet().stream()
                .map(e -> new DayBucket(e.getKey().toString(), e.getValue()[0], e.getValue()[1]))
                .toList();

        int dailyMinutes = 0;
        int weeklyMinutes = 0;
        int monthlyMinutes = 0;

        LocalDate sevenDaysAgo = today.minusDays(7);
        LocalDate thirtyDaysAgo = today.minusDays(30);

        Set<LocalDate> activeDays = new HashSet<>();

        for (StudySession s : allSessions) {
            LocalDate d = s.getSessionDate().atZone(zone).toLocalDate();
            activeDays.add(d);
            int mins = s.getDurationMinutes();
            if (d.equals(today)) dailyMinutes += mins;
            if (!d.isBefore(sevenDaysAgo)) weeklyMinutes += mins;
            if (!d.isBefore(thirtyDaysAgo)) monthlyMinutes += mins;
        }

        int streak = 0;
        LocalDate checkDate = today;
        if (!activeDays.contains(checkDate)) {
            checkDate = today.minusDays(1);
        }
        while (activeDays.contains(checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }

        int avgSessionDuration = sessions.isEmpty() ? 0 : Math.round((float) totalMinutes / sessions.size());

        String mostProductiveDay = dayOfWeekMinutes.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("None");

        String mostStudiedSubject = subjectBreakdown.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("None");

        List<String> insights = new ArrayList<>();
        if (streak > 0) insights.add(streak + "-day study streak active! Keep going.");
        if (!"None".equals(mostStudiedSubject)) insights.add("Top studied subject: " + mostStudiedSubject + " (" + subjectBreakdown.get(mostStudiedSubject) + " mins).");
        if (!"None".equals(mostProductiveDay)) insights.add("Most productive day: " + mostProductiveDay + ".");
        if (weeklyMinutes > 0) insights.add("You studied " + String.format("%.1f", weeklyMinutes / 60.0) + " hours in the past week.");
        if (insights.isEmpty()) insights.add("Start your first timer session to track productivity trends!");

        return new AnalyticsResponse(
                totalMinutes,
                sessions.size(),
                byDay,
                dailyMinutes,
                weeklyMinutes,
                monthlyMinutes,
                subjectBreakdown,
                longestSessionMinutes,
                avgSessionDuration,
                streak,
                mostProductiveDay,
                mostStudiedSubject,
                insights
        );
    }

    public record TaskRequest(String userId, String title, String subject, String deadline) {}
    public record SessionRequest(String userId, String subject, int minutes) {}
    public record DayBucket(String date, int minutes, int sessions) {}
    public record AnalyticsResponse(
            int totalMinutes,
            int totalSessions,
            List<DayBucket> byDay,
            int dailyMinutes,
            int weeklyMinutes,
            int monthlyMinutes,
            Map<String, Integer> subjectBreakdown,
            int longestSessionMinutes,
            int averageSessionDuration,
            int currentStreakDays,
            String mostProductiveDay,
            String mostStudiedSubject,
            List<String> insights
    ) {
        public AnalyticsResponse(int totalMinutes, int totalSessions, List<DayBucket> byDay) {
            this(totalMinutes, totalSessions, byDay, totalMinutes, totalMinutes, totalMinutes, Map.of(), 0, 0, 0, "None", "None", List.of());
        }
    }
}