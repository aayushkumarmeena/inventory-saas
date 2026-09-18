package com.inventory.dto.response;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GstConfigResponse {
    private Long id;
    private String gstin,legalName,tradeName,addressLine1,addressLine2,city,state,stateCode,pincode,pan,email,phone;
    private Boolean isComposition;
    private String filingFrequency;
    private LocalDateTime updatedAt;
}
