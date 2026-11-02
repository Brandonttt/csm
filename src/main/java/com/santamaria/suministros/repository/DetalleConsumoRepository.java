package com.santamaria.suministros.repository;

import com.santamaria.suministros.model.DetalleConsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DetalleConsumoRepository extends JpaRepository<DetalleConsumo, Long> {

    @Query("SELECT d FROM DetalleConsumo d LEFT JOIN FETCH d.insumo WHERE d.evento.id = :eventoId")
    List<DetalleConsumo> findByEventoId(@Param("eventoId") Long eventoId);
}