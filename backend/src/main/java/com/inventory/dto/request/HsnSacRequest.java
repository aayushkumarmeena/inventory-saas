package com.inventory.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;

@Data public class HsnSacRequest {
    @NotBlank @Size(max=20) private String code;
    @NotBlank @Pattern(regexp="^(HSN|SAC)$",message="Must be HSN or SAC") private String type;
    @NotBlank private String description;
    @NotNull @DecimalMin("0") @DecimalMax("50") private BigDecimal cgstRate;
    @NotNull @DecimalMin("0") @DecimalMax("50") private BigDecimal sgstRate;
    @NotNull @DecimalMin("0") @DecimalMax("100") private BigDecimal igstRate;
    @DecimalMin("0") @DecimalMax("100") private BigDecimal cessRate = BigDecimal.ZERO;
}
