package com.profy256.profy.modules.lessons.service;

import com.profy256.profy.modules.lessons.entity.Lesson;
import com.profy256.profy.modules.lessons.entity.LessonVideo;
import com.profy256.profy.modules.lessons.repository.LessonRepository;
import com.profy256.profy.modules.lessons.repository.LessonVideoRepository;
import com.profy256.profy.modules.taxonomy.entity.TaxonomyNode;
import com.profy256.profy.modules.taxonomy.repository.TaxonomyNodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AutoCurationServiceTest {

    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private LessonVideoRepository lessonVideoRepository;
    @Mock
    private TaxonomyNodeRepository taxonomyNodeRepository;
    @Mock
    private YouTubeSearchService youTubeSearchService;

    @InjectMocks
    private AutoCurationService autoCurationService;

    private UUID nodeId;
    private UUID lessonId;
    private Lesson lesson;
    private TaxonomyNode courseNode;

    @BeforeEach
    void setUp() {
        nodeId = UUID.randomUUID();
        lessonId = UUID.randomUUID();

        courseNode = new TaxonomyNode();
        courseNode.setId(nodeId);
        courseNode.setName("Java Basics");
        courseNode.setSlug("java-basics");
        courseNode.setNodeType("course");
        courseNode.setPhase(1);

        lesson = new Lesson();
        lesson.setId(lessonId);
        lesson.setNodeId(nodeId);
        lesson.setTitle("Variables");
        lesson.setSlug("variables");
        lesson.setDescription("Learn about variables");
        lesson.setStatus("published");
    }

    private LessonVideo autoVideo(String videoId) {
        LessonVideo v = new LessonVideo();
        v.setId(UUID.randomUUID());
        v.setLessonId(lessonId);
        v.setYoutubeVideoId(videoId);
        v.setTitle("Auto Video");
        v.setIsPrimary(true);
        v.setCuratorStatus("pending");
        v.setSource("auto");
        return v;
    }

    @Test
    void autoCurate_persistsAutoVideoWithExpectedFields() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonVideoRepository.findByLessonIdAndSource(lessonId, "auto")).thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(lessonId)).thenReturn(Collections.emptyList());
        when(taxonomyNodeRepository.findById(nodeId)).thenReturn(Optional.of(courseNode));
        when(youTubeSearchService.isConfigured()).thenReturn(true);
        when(youTubeSearchService.search("Java Basics Variables")).thenReturn(List.of(
                new YouTubeSearchService.VideoCandidate("dQw4w9WgXcQ", "Variables explained", "Java Channel")));
        when(lessonVideoRepository.save(any(LessonVideo.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        LessonVideo result = autoCurationService.autoCurateForLesson(lessonId);

        assertThat(result).isNotNull();
        assertThat(result.getSource()).isEqualTo("auto");
        assertThat(result.getIsPrimary()).isTrue();
        assertThat(result.getCuratorStatus()).isEqualTo("pending");
        assertThat(result.getYoutubeVideoId()).isEqualTo("dQw4w9WgXcQ");
        assertThat(result.getTitle()).isEqualTo("Variables explained");
        assertThat(result.getChannel()).isEqualTo("Java Channel");
        assertThat(result.getAddedBy()).isNull();
        assertThat(result.getNotes()).contains("Java Basics Variables");

        ArgumentCaptor<LessonVideo> captor = ArgumentCaptor.forClass(LessonVideo.class);
        verify(lessonVideoRepository).save(captor.capture());
        assertThat(captor.getValue().getLessonId()).isEqualTo(lessonId);
    }

    @Test
    void autoCurate_skipsLessonThatAlreadyHasAutoVideo() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonVideoRepository.findByLessonIdAndSource(lessonId, "auto"))
                .thenReturn(Optional.of(autoVideo("auto5678901")));

        LessonVideo result = autoCurationService.autoCurateForLesson(lessonId);

        assertThat(result).isNull();
        verify(youTubeSearchService, never()).search(anyString());
        verify(lessonVideoRepository, never()).save(any(LessonVideo.class));
    }

    @Test
    void autoCurate_skipsLessonWithCuratedVideos() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonVideoRepository.findByLessonIdAndSource(lessonId, "auto")).thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(lessonId))
                .thenReturn(List.of(autoVideo("curated0001"))); // any existing video row

        LessonVideo result = autoCurationService.autoCurateForLesson(lessonId);

        assertThat(result).isNull();
        verify(youTubeSearchService, never()).search(anyString());
    }

    @Test
    void autoCurate_disabledWhenNoApiKey() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonVideoRepository.findByLessonIdAndSource(lessonId, "auto")).thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(lessonId)).thenReturn(Collections.emptyList());
        when(youTubeSearchService.isConfigured()).thenReturn(false);

        LessonVideo result = autoCurationService.autoCurateForLesson(lessonId);

        assertThat(result).isNull();
        verify(youTubeSearchService, never()).search(anyString());
    }

    @Test
    void autoCurate_noSearchResults_returnsNullWithoutSaving() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonVideoRepository.findByLessonIdAndSource(lessonId, "auto")).thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(lessonId)).thenReturn(Collections.emptyList());
        when(taxonomyNodeRepository.findById(nodeId)).thenReturn(Optional.of(courseNode));
        when(youTubeSearchService.isConfigured()).thenReturn(true);
        when(youTubeSearchService.search("Java Basics Variables")).thenReturn(Collections.emptyList());

        LessonVideo result = autoCurationService.autoCurateForLesson(lessonId);

        assertThat(result).isNull();
        verify(lessonVideoRepository, never()).save(any(LessonVideo.class));
    }

    @Test
    void autoCurate_skipsCandidateAlreadyAttachedToLesson() {
        LessonVideo existing = autoVideo("existing001");
        existing.setYoutubeVideoId("dQw4w9WgXcQ"); // curated row for the same video id
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonVideoRepository.findByLessonIdAndSource(lessonId, "auto")).thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(lessonId))
                .thenReturn(Collections.emptyList())           // uncovered check
                .thenReturn(List.of(existing));                // existing-ids check
        when(taxonomyNodeRepository.findById(nodeId)).thenReturn(Optional.of(courseNode));
        when(youTubeSearchService.isConfigured()).thenReturn(true);
        when(youTubeSearchService.search("Java Basics Variables")).thenReturn(List.of(
                new YouTubeSearchService.VideoCandidate("dQw4w9WgXcQ", "Variables explained", "Java Channel")));

        LessonVideo result = autoCurationService.autoCurateForLesson(lessonId);

        assertThat(result).isNull();
        verify(lessonVideoRepository, never()).save(any(LessonVideo.class));
    }

    @Test
    void autoCurate_raceOnUniqueIndex_returnsExistingAutoVideo() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonVideoRepository.findByLessonIdAndSource(lessonId, "auto"))
                .thenReturn(Optional.empty())                  // pre-check
                .thenReturn(Optional.of(autoVideo("winner00001"))); // post-violation re-read
        when(lessonVideoRepository.findByLessonId(lessonId)).thenReturn(Collections.emptyList());
        when(taxonomyNodeRepository.findById(nodeId)).thenReturn(Optional.of(courseNode));
        when(youTubeSearchService.isConfigured()).thenReturn(true);
        when(youTubeSearchService.search("Java Basics Variables")).thenReturn(List.of(
                new YouTubeSearchService.VideoCandidate("dQw4w9WgXcQ", "Variables explained", "Java Channel")));
        when(lessonVideoRepository.save(any(LessonVideo.class)))
                .thenThrow(new DataIntegrityViolationException("uq_lesson_videos_one_auto"));

        LessonVideo result = autoCurationService.autoCurateForLesson(lessonId);

        assertThat(result).isNotNull();
        assertThat(result.getYoutubeVideoId()).isEqualTo("winner00001");
    }

    @Test
    void autoCurate_nonexistentLesson_returnsNull() {
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.empty());

        assertThat(autoCurationService.autoCurateForLesson(lessonId)).isNull();
    }

    @Test
    void sweep_fillsOnlyUncoveredLessons_upToCap() {
        Lesson a = new Lesson();
        a.setId(UUID.randomUUID());
        a.setNodeId(nodeId);
        a.setTitle("A");
        Lesson b = new Lesson();
        b.setId(UUID.randomUUID());
        b.setNodeId(nodeId);
        b.setTitle("B");

        when(youTubeSearchService.isConfigured()).thenReturn(true);
        when(lessonRepository.findPublishedLessonsWithoutVideos()).thenReturn(List.of(a, b));
        when(lessonVideoRepository.findByLessonIdAndSource(any(UUID.class), eq("auto"))).thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(any(UUID.class))).thenReturn(Collections.emptyList());
        when(taxonomyNodeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());
        when(youTubeSearchService.search(anyString())).thenReturn(List.of(
                new YouTubeSearchService.VideoCandidate("dQw4w9WgXcQ", "T", "C")));
        when(lessonVideoRepository.save(any(LessonVideo.class))).thenAnswer(inv -> inv.getArgument(0));

        int filled = autoCurationService.sweepUncoveredLessons(50);

        assertThat(filled).isEqualTo(2);
        verify(lessonVideoRepository, times(2)).save(any(LessonVideo.class));
    }

    @Test
    void sweep_respectsMaxLessonsCap() {
        Lesson a = new Lesson();
        a.setId(UUID.randomUUID());
        a.setNodeId(nodeId);
        a.setTitle("A");

        when(youTubeSearchService.isConfigured()).thenReturn(true);
        when(lessonRepository.findPublishedLessonsWithoutVideos()).thenReturn(List.of(a, a, a, a));
        when(lessonVideoRepository.findByLessonIdAndSource(any(UUID.class), eq("auto"))).thenReturn(Optional.empty());
        when(lessonVideoRepository.findByLessonId(any(UUID.class))).thenReturn(Collections.emptyList());
        when(taxonomyNodeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());
        when(youTubeSearchService.search(anyString())).thenReturn(List.of(
                new YouTubeSearchService.VideoCandidate("dQw4w9WgXcQ", "T", "C")));
        when(lessonVideoRepository.save(any(LessonVideo.class))).thenAnswer(inv -> inv.getArgument(0));

        int filled = autoCurationService.sweepUncoveredLessons(2);

        assertThat(filled).isEqualTo(2);
        verify(lessonVideoRepository, times(2)).save(any(LessonVideo.class));
    }

    @Test
    void sweep_disabled_noop() {
        when(youTubeSearchService.isConfigured()).thenReturn(false);

        assertThat(autoCurationService.sweepUncoveredLessons(50)).isZero();
        verify(lessonRepository, never()).findPublishedLessonsWithoutVideos();
    }
}
