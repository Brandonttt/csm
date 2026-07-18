package com.santamaria.suministros.service;

import com.santamaria.suministros.dto.CuentaPacienteDTO;
import com.santamaria.suministros.dto.DetalleFilaDTO;
import com.santamaria.suministros.model.DetalleConsumo;
import com.santamaria.suministros.model.EventoHospitalario;
import com.santamaria.suministros.repository.DetalleConsumoRepository;
import com.santamaria.suministros.repository.EventoHospitalarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class CuentaService {

    @Autowired
    private EventoHospitalarioRepository eventoRepository;

    @Autowired
    private DetalleConsumoRepository detalleConsumoRepository;

    public CuentaPacienteDTO calcularCuentaTotal(Long eventoId) {
        // 1. Validar que el evento (la hoja) exista
        EventoHospitalario evento = eventoRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("El evento hospitalario no existe con ID: " + eventoId));

        // 2. Traer todos los insumos que registró enfermería para este evento
        List<DetalleConsumo> consumos = detalleConsumoRepository.findByEventoId(eventoId);

        BigDecimal subtotal = BigDecimal.ZERO;
        List<DetalleFilaDTO> filasDto = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        // 3. Iterar fila por fila calculando el coste automático
        for (DetalleConsumo consumo : consumos) {
            BigDecimal precio = consumo.getInsumo().getPrecioUnitario();
            BigDecimal cantidad = new BigDecimal(consumo.getCantidad());
            
            // Operación: Cantidad * Precio Unitario
            BigDecimal costeoFila = precio.multiply(cantidad);
            
            // Acumular en el subtotal global
            subtotal = subtotal.add(costeoFila);

            // Mapear al formato de la fila para Recepción
            DetalleFilaDTO fila = new DetalleFilaDTO(
                    consumo.getFechaAplicacion().format(formatter),
                    consumo.getInsumo().getDescripcion(),
                    consumo.getCantidad(),
                    precio,
                    costeoFila
            );
            filasDto.add(fila);
        }

        // 4. Calcular Impuestos (IVA del 16% sobre el subtotal)
        BigDecimal iva = subtotal.multiply(new BigDecimal("0.16"));
        BigDecimal total = subtotal.add(iva);

        // 5. Armar el DTO final estructurado
        CuentaPacienteDTO cuenta = new CuentaPacienteDTO();
        cuenta.setNombrePaciente(evento.getPaciente().getNombre());
        cuenta.setMedicoTratante(evento.getMedico().getNombre());
        cuenta.setHabitacion(evento.getHabitacion());
        cuenta.setProcedimiento(evento.getProcedimiento());
        cuenta.setFilas(filasDto);
        cuenta.setSubtotal(subtotal);
        cuenta.setIva(iva);
        cuenta.setTotal(total);

        return cuenta;
    }
}