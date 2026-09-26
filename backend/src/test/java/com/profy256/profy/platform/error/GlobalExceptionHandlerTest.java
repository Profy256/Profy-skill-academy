package com.profy256.profy.platform.error;

import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @SuppressWarnings("unchecked")
    private String errorCode(ResponseEntity<Map<String, Object>> response) {
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        return (String) error.get("code");
    }

    @Test
    void invalidUuidPathParameterIs400ValidationError() {
        ResponseEntity<Map<String, Object>> response = handler.handleTypeMismatch(
                new MethodArgumentTypeMismatchException("not-a-uuid", String.class, "id", null, null));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("validation_error");
    }

    @Test
    void malformedJsonBodyIs400BadRequest() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleUnreadableBody(new HttpMessageNotReadableException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("bad_request");
    }

    @Test
    void missingRequestParamIs400ValidationError() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleMissingParam(new MissingServletRequestParameterException("q", "String"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("validation_error");
    }

    @Test
    void unsupportedHttpMethodIs405() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleMethodNotAllowed(new HttpRequestMethodNotSupportedException("PUT"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(errorCode(response)).isEqualTo("method_not_allowed");
    }

    @Test
    void unsupportedContentTypeIs415() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleUnsupportedMediaType(new HttpMediaTypeNotSupportedException("application/xml"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        assertThat(errorCode(response)).isEqualTo("unsupported_media_type");
    }

    @Test
    void constraintViolationWithoutDetailsStillReturns400() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleConstraintViolation(new ConstraintViolationException(Set.of()));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(response)).isEqualTo("validation_error");
    }
}
