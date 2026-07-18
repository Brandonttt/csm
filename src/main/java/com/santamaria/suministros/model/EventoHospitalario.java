package com.santamaria.suministros.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "eventos_hospitalarios")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class EventoHospitalario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "paciente_id", nullable = false)
    private Paciente paciente;

    @ManyToOne
    @JoinColumn(name = "medico_id", nullable = false)
    private Medico medico;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(length = 20)
    private String habitacion; // Ej. "5"

    @Column(length = 150)
    private String procedimiento; // Ej. "Circuncisión"
}