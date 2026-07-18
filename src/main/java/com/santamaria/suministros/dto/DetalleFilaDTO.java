package com.santamaria.suministros.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DetalleFilaDTO {
    private String fecha;
    private String articulo;
    private Integer cantidad;
    private BigDecimal precioUnitario;
    private BigDecimal costeo; // cantidad * precioUnitario
}