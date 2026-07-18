package com.santamaria.suministros.repository;

import com.santamaria.suministros.model.DetalleConsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DetalleConsumoRepository extends JpaRepository<DetalleConsumo, Long> {
    
    // Este método busca automáticamente todos los consumos usando el ID del Evento Hospitalario
    List<DetalleConsumo> findByEventoId(Long eventoId);
}