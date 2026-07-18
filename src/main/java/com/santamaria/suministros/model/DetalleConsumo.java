package com.santamaria.suministros.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "detalle_consumos")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class DetalleConsumo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "evento_id", nullable = false)
    private EventoHospitalario evento;

    @ManyToOne
    @JoinColumn(name = "insumo_id", nullable = false)
    private Insumo insumo;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "fecha_aplicacion", nullable = false)
    private LocalDate fechaAplicacion;

    @Column(name = "cantidad_recibida")
    private Integer cantidadRecibida;

    @Column(name = "ingreso_al_sistema")
    private Boolean ingresoAlSistema = false;
}