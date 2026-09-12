package com.profy256.profy.modules.lessons.service;

import com.profy256.profy.modules.lessons.dto.LessonRequests.CreateLessonRequest;
import com.profy256.profy.modules.lessons.dto.LessonRequests.VideoInput;
import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.lessons.repository.LessonVideoRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import com.profy256.profy.platform.error.BadRequestException;
import com.profy256.profy.platform.error.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LessonsServiceTest {

    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private LessonVideoRepository lessonVideoRepository;
    @Mock
    private TaxonomyNodeRepository taxonomyNodeRepository;

    @InjectMocks
    private LessonsService lessonsService;

    private UUID nodeId;
    private UUID lessonId;
    private UUID videoId;
    private UUID adminUserId;
    private TaxonomyNode courseNode;
    private Lesson publishedLesson;
    private Lesson draftLesson;
    private LessonVideo primaryVideo;
    private LessonVideo alternateVideo;

    @BeforeEach
    void setUp() {
        nodeId = UUID.randomUUID();
        lessonId = UUID.randomUUID();
        videoId = UUID.randomUUID();
        adminUserId = UUID.randomUUID();

        courseNode = new TaxonomyNode();
        courseNode.setId(nodeId);
        courseNode.setName("Java Basics");
        courseNode.setSlug("java-basics");
        courseNode.setNodeType("course");
        courseNode.setPhase(1);

        publishedLesson = new Lesson();
        publishedLesson.setId(lessonId);
        publishedLesson.setNodeId(nodeId);
        publishedLesson.setTitle("Variables");
        publishedLesson.setSlug("variables");
        publishedLesson.setDescription("Learn about variables");
        publishedLesson.setLevel("beginner");
        publishedLesson.setStatus("published");
        publishedLesson.setSortOrder(0);

        draftLesson = new Lesson();
        draftLesson.setId(UUID.randomUUID());
        draftLesson.setNodeId(nodeId);
        draftLesson.setTitle("Draft Lesson");
        draftLesson.setSlug("draft-lesson");
        draftLesson.setStatus("draft");

        primaryVideo = new LessonVideo();
        primaryVideo.setId(videoId);
        primaryVideo.setLessonId(lessonId);
        primaryVideo.setYoutubeVideoId("dQw4w9WgXcQ");
        primaryVideo.setTitle("Primary Video");
        primaryVideo.setIsPrimary(true);
        primaryVideo.setCuratorStatus("approved");

        alternateVideo = new LessonVideo();
        alternateVideo.setId(UUID.randomUUID());
        alternateVideo.setLessonId(lessonId);
        alternateVideo.setYoutubeVideoId("abc12345678");
        alternateVideo.setTitle("Alternate Video");
        alternateVideo.setIsPrimary(false);
        alternateVideo.setCuratorStatus("pending");
    }

    @Test
    void getCourseBySlug_returnsCourseWithPublishedLessonsOnly() {
        when(taxonomyNodeRepository.findBySlug("java-basics")).thenReturn(Optional.of(courseNode));
        when(lessonRepository.findByStatusAndNodeId("published", nodeId))
                .thenReturn(List.of(publishedLesson));

        Map<String, Object> result = lessonsService.getCourseBySlug("java-basics");

        assertThat(result.get("name")).isEqualTo("Java Basics");
        assertThat(result.get("slug")).isEqualTo("java-basics");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lessons = (List<Map<String, Object>>) result.get("lessons");
        assertThat(lessons).hasSize(1);
        assertThat(lessons.get(0).get("title")).isEqualTo("Variables");
    }

    @Test
    void getCourseBySlug_draftLessonsHidden() {
        when(taxonomyNodeRepository.findBySlug("java-basics")).thenReturn(Optional.of(courseNode));
        when(lessonRepository.findByStatusAndNodeId("published", nodeId))
                .thenReturn(Collections.emptyList());

        Map<String, Object> result = lessonsService.getCourseBySlug("java-basics");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lessons = (List<Map<String, Object>>) result.get("lessons");
        assertThat(lessons).isEmpty();
    }

    @Test
    void getCourseBySlug_nonexistentSlug_throwsResourceNotFound() {
        when(taxonomyNodeRepository.findBySlug("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lessonsService.getCourseBySlug("nonexistent"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Course not found");
    }

    @Test
    void getLessonBySlug_returnsLessonWithPrimaryVideoAndAlternates() {
        when(lessonRepository.findBySlug("variables")).thenReturn(Optional.of(publishedLesson));
        when(lessonVideoRepository.findByLessonIdAndIsPrimaryTrue(lessonId))
                .thenReturn(Optional.of(primaryVideo));
        when(lessonVideoRepository.findByLessonId(lessonId))
                .thenReturn(List.of(primaryVideo, alternateVideo));

        Map<String, Object> result = lessonsService.getLessonBySlug("variables");

        assertThat(result.get("title")).isEqualTo("Variables");
        assertThat(result.get("status")).isEqualTo("published");

        Map<String, Object> primary = (Map<String, Object>) result.get("primaryVideo");
        assertThat(primary).isNotNull();
        assertThat(primary.get("title")).isEqualTo("Primary Video");
        assertThat(primary.get("youtubeVideoId")).isEqualTo("dQw4w9WgXcQ");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> videos = (List<Map<String, Object>>) result.get("videos");
        assertThat(videos).hasSize(2);
    }

    @Test
    void getLessonBySlug_draftLesson_throwsResourceNotFound() {
        when(lessonRepository.findBySlug("draft-lesson")).thenReturn(Optional.of(draftLesson));

        assertThatThrownBy(() -> lessonsService.getLessonBySlug("draft-lesson"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Lesson not found");
    }

    @Test
    void getLessonBySlug_nonexistentSlug_throwsResourceNotFound() {
        when(lessonRepository.findBySlug("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> lessonsService.getLessonBySlug("nonexistent"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getLessonBySlug_noPrimaryVideo_returnsNullPrimary() {
        when(lessonRepository.findBySlug("variables")).thenReturn(Optional.of(publishedLesson));
        when(lessonVideoRepository.findByLessonIdAndIsPrimaryTrue(lessonId))
                .thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(lessonId))
                .thenReturn(List.of(alternateVideo));

        Map<String, Object> result = lessonsService.getLessonBySlug("variables");

        assertThat(result.get("primaryVideo")).isNull();
    }

    @Test
    void createLesson_success() {
        when(taxonomyNodeRepository.findById(nodeId)).thenReturn(Optional.of(courseNode));
        when(lessonRepository.findBySlug("new-lesson")).thenReturn(Optional.empty());
        when(lessonRepository.save(any(Lesson.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateLessonRequest request = new CreateLessonRequest(
                nodeId.toString(), "New Lesson", "new-lesson", "desc",
                "explanation", List.of("obj1"), List.of("ex1"), List.of("exer1"),
                null, "beginner", "published", 0);

        Lesson result = lessonsService.createLesson(request, adminUserId);

        assertThat(result.getTitle()).isEqualTo("New Lesson");
        assertThat(result.getSlug()).isEqualTo("new-lesson");
        assertThat(result.getNodeId()).isEqualTo(nodeId);
        assertThat(result.getCreatedBy()).isEqualTo(adminUserId);
        assertThat(result.getStatus()).isEqualTo("published");
    }

    @Test
    void createLesson_duplicateSlug_throwsBadRequest() {
        when(taxonomyNodeRepository.findById(nodeId)).thenReturn(Optional.of(courseNode));
        when(lessonRepository.findBySlug("variables")).thenReturn(Optional.of(publishedLesson));

        CreateLessonRequest request = new CreateLessonRequest(
                nodeId.toString(), "Variables Copy", "variables", "desc",
                null, null, null, null, null, "beginner", "draft", 0);

        assertThatThrownBy(() -> lessonsService.createLesson(request, adminUserId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lesson slug already exists");
    }

    @Test
    void createLesson_nonexistentNode_throwsResourceNotFound() {
        when(taxonomyNodeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        CreateLessonRequest request = new CreateLessonRequest(
                UUID.randomUUID().toString(), "Lesson", "slug", "desc",
                null, null, null, null, null, "beginner", "draft", 0);

        assertThatThrownBy(() -> lessonsService.createLesson(request, adminUserId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Taxonomy node not found");
    }

    @Test
    void addVideoToLesson_success() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(publishedLesson));
        when(lessonVideoRepository.save(any(LessonVideo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VideoInput input = new VideoInput(
                "https://youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ",
                "Video Title", "Channel Name", true, "approved", "notes");

        LessonVideo result = lessonsService.addVideoToLesson(lessonId, input, adminUserId);

        assertThat(result.getYoutubeVideoId()).isEqualTo("dQw4w9WgXcQ");
        assertThat(result.getTitle()).isEqualTo("Video Title");
        assertThat(result.getChannel()).isEqualTo("Channel Name");
        assertThat(result.getIsPrimary()).isTrue();
        assertThat(result.getCuratorStatus()).isEqualTo("approved");
        assertThat(result.getAddedBy()).isEqualTo(adminUserId);
    }

    @Test
    void addVideoToLesson_invalidYouTubeId_throwsBadRequest() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(publishedLesson));

        VideoInput input = new VideoInput(
                "https://youtube.com/watch?v=invalid", "invalid",
                "Video", "Channel", false, null, null);

        assertThatThrownBy(() -> lessonsService.addVideoToLesson(lessonId, input, adminUserId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid YouTube video ID format");
    }

    @Test
    void addVideoToLesson_blankVideoId_throwsBadRequest() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(publishedLesson));

        VideoInput input = new VideoInput(
                null, "", "Video", "Channel", false, null, null);

        assertThatThrownBy(() -> lessonsService.addVideoToLesson(lessonId, input, adminUserId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("YouTube video ID is required");
    }

    @Test
    void addVideoToLesson_nullVideoId_throwsBadRequest() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(publishedLesson));

        VideoInput input = new VideoInput(
                null, null, "Video", "Channel", false, null, null);

        assertThatThrownBy(() -> lessonsService.addVideoToLesson(lessonId, input, adminUserId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("YouTube video ID is required");
    }

    @Test
    void addVideoToLesson_nonexistentLesson_throwsResourceNotFound() {
        when(lessonRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        VideoInput input = new VideoInput(
                null, "dQw4w9WgXcQ", "Video", "Channel", false, null, null);

        assertThatThrownBy(() -> lessonsService.addVideoToLesson(UUID.randomUUID(), input, adminUserId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void search_returnsOnlyPublishedLessons() {
        when(lessonRepository.searchByTitleOrDescription("java"))
                .thenReturn(List.of(publishedLesson, draftLesson));

        List<Map<String, Object>> results = lessonsService.search("java");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).get("title")).isEqualTo("Variables");
    }

    @Test
    void search_blankQuery_returnsEmpty() {
        List<Map<String, Object>> results = lessonsService.search("");
        assertThat(results).isEmpty();

        results = lessonsService.search(null);
        assertThat(results).isEmpty();

        verify(lessonRepository, never()).searchByTitleOrDescription(any());
    }
}
