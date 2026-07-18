package com.santamaria.suministros.repository;

import com.santamaria.suministros.model.EventoHospitalario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventoHospitalarioRepository extends JpaRepository<EventoHospitalario, Long> {
}