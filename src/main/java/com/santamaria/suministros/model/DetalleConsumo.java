package com.santamaria.suministros.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "detalle_consumos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DetalleConsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "evento_id", nullable = false)
    private EventoHospitalario evento;

    // 🛠️ PERMITIR NULL para insumos registrados a mano
    @ManyToOne
    @JoinColumn(name = "insumo_id", nullable = true)
    private Insumo insumo;

    // 🛠️ NUEVAS COLUMNAS PARA CAPTURA LIBRE
    @Column(name = "descripcion_manual")
    private String descripcionManual;

    @Column(name = "precio_unitario_aplicado", precision = 10, scale = 2)
    private BigDecimal precioUnitarioAplicado;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "fecha_aplicacion", nullable = false)
    private LocalDate fechaAplicacion;

    @Column(name = "cantidad_recibida")
    private Integer cantidadRecibida;

    @Column(name = "ingreso_al_sistema")
    private Boolean ingresoAlSistema = false;

    @Column(name = "turno")
    private String turno;
}