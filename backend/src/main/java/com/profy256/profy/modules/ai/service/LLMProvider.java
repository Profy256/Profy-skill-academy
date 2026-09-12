package com.profy256.profy.modules.ai.service;

import java.util.List;

public interface LLMProvider {

    record ChatMessage(String role, String content) {}

    record ChatResponse(String content) {}

    ChatResponse complete(List<ChatMessage> messages, String systemPrompt);
}
