package com.santamaria.suministros.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "medicos")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Medico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;
}