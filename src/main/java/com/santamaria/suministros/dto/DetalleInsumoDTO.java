package com.santamaria.suministros.dto;

import java.math.BigDecimal;

public class DetalleInsumoDTO {
    private Long insumoId; // 👈 Para saber si viene del catálogo
    private String descripcionManual; // 👈 Nombre ingresado a mano
    private String fecha;
    private String descripcion;
    private Integer cantidad;
    private Integer cantidadRecibida;
    private Boolean ingresoAlSistema;
    private BigDecimal precioUnitario;
    private BigDecimal importe;
    private String turno;

    public DetalleInsumoDTO() {
    }

    public DetalleInsumoDTO(Long insumoId, String descripcionManual, String fecha, String descripcion,
            Integer cantidad, Integer cantidadRecibida, Boolean ingresoAlSistema,
            BigDecimal precioUnitario, BigDecimal importe, String turno) {
        this.insumoId = insumoId;
        this.descripcionManual = descripcionManual;
        this.fecha = fecha;
        this.descripcion = descripcion;
        this.cantidad = cantidad;
        this.cantidadRecibida = cantidadRecibida;
        this.ingresoAlSistema = ingresoAlSistema;
        this.precioUnitario = precioUnitario;
        this.importe = importe;
        this.turno = turno;
    }

    // Getters y Setters
    public Long getInsumoId() {
        return insumoId;
    }

    public void setInsumoId(Long insumoId) {
        this.insumoId = insumoId;
    }

    public String getDescripcionManual() {
        return descripcionManual;
    }

    public void setDescripcionManual(String descripcionManual) {
        this.descripcionManual = descripcionManual;
    }

    public String getFecha() {
        return fecha;
    }

    public void setFecha(String fecha) {
        this.fecha = fecha;
    }

    public String getDescription() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public Integer getCantidadRecibida() {
        return cantidadRecibida;
    }

    public void setCantidadRecibida(Integer cantidadRecibida) {
        this.cantidadRecibida = cantidadRecibida;
    }

    public Boolean getIngresoAlSistema() {
        return ingresoAlSistema;
    }

    public void setIngresoAlSistema(Boolean ingresoAlSistema) {
        this.ingresoAlSistema = ingresoAlSistema;
    }

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public BigDecimal getImporte() {
        return importe;
    }

    public void setImporte(BigDecimal importe) {
        this.importe = importe;
    }

    public String getTurno() {
        return turno;
    }

    public void setTurno(String turno) {
        this.turno = turno;
    }
}