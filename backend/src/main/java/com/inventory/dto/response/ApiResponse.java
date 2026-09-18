package com.inventory.dto.response;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
}
