package com.santamaria.suministros.dto;

import java.math.BigDecimal;
import java.util.List;

public class CuentaResponseDTO {
    private Long eventoId;
    private String nombrePaciente;
    private String nombreMedico;
    private String procedimiento; // Nuevo campo para el procedimiento
    private String horaSalidaQx;
    private String fechaEmision;
    private List<DetalleInsumoDTO> detalles;
    private BigDecimal subtotal;
    private BigDecimal iva;
    private BigDecimal total;

    // Constructor vacío obligatorio para Jackson (Serialización/Deserialización
    // JSON)
    public CuentaResponseDTO() {
    }

    // Constructor con parámetros
    public CuentaResponseDTO(Long eventoId, String nombrePaciente, String nombreMedico,
            String procedimiento, String horaSalidaQx, String fechaEmision, List<DetalleInsumoDTO> detalles,
            BigDecimal subtotal, BigDecimal iva, BigDecimal total) {
        this.eventoId = eventoId;
        this.nombrePaciente = nombrePaciente;
        this.nombreMedico = nombreMedico;
        this.procedimiento = procedimiento;
        this.horaSalidaQx = horaSalidaQx;
        this.fechaEmision = fechaEmision;
        this.detalles = detalles;
        this.subtotal = subtotal;
        this.iva = iva;
        this.total = total;
    }

    // Getters y Setters
    public Long getEventoId() {
        return eventoId;
    }

    public void setEventoId(Long eventoId) {
        this.eventoId = eventoId;
    }

    public String getNombrePaciente() {
        return nombrePaciente;
    }

    public void setNombrePaciente(String nombrePaciente) {
        this.nombrePaciente = nombrePaciente;
    }

    public String getNombreMedico() {
        return nombreMedico;
    }

    public void setNombreMedico(String nombreMedico) {
        this.nombreMedico = nombreMedico;
    }

    public String getProcedimiento() {
        return procedimiento;
    }

    public void setProcedimiento(String procedimiento) {
        this.procedimiento = procedimiento;
    }

    public String getHoraSalidaQx() {
        return horaSalidaQx;
    }

    public void setHoraSalidaQx(String horaSalidaQx) {
        this.horaSalidaQx = horaSalidaQx;
    }

    public String getFechaEmision() {
        return fechaEmision;
    }

    public void setFechaEmision(String fechaEmision) {
        this.fechaEmision = fechaEmision;
    }

    public List<DetalleInsumoDTO> getDetalles() {
        return detalles;
    }

    public void setDetalles(List<DetalleInsumoDTO> detalles) {
        this.detalles = detalles;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getIva() {
        return iva;
    }

    public void setIva(BigDecimal iva) {
        this.iva = iva;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

}