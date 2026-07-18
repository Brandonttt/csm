package com.santamaria.suministros.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CuentaPacienteDTO {
    private String nombrePaciente;
    private String medicoTratante;
    private String habitacion;
    private String procedimiento;
    private List<DetalleFilaDTO> filas;
    private BigDecimal subtotal;
    private BigDecimal iva;
    private BigDecimal total;
}