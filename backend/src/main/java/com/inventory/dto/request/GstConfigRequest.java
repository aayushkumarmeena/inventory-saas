package com.inventory.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data public class GstConfigRequest {
    @NotBlank @Pattern(regexp="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",message="Invalid GSTIN") private String gstin;
    @NotBlank private String legalName;
    private String tradeName,addressLine1,addressLine2,city;
    @NotBlank private String state;
    @NotBlank @Size(min=2,max=3) private String stateCode;
    private String pincode;
    @Pattern(regexp="^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$",message="Invalid PAN") private String pan;
    private String email,phone;
    private Boolean isComposition;
    private String filingFrequency;
}
